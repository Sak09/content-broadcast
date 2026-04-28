const ContentModel = require('../models/content.model');
const AnalyticsModel = require('../models/analytics.model');
const { cacheGet, cacheSet, cacheDelPattern } = require('../config/redis');
const logger = require('../utils/logger');

class SchedulingService {

  static determineActiveContent(items) {
    if (!items || items.length === 0) return null;

    // Group by subject
    const bySubject = {};
    for (const item of items) {
      const subj = item.subject;
      if (!bySubject[subj]) bySubject[subj] = [];
      bySubject[subj].push(item);
    }

    const activePerSubject = {};

    for (const [subject, subjectItems] of Object.entries(bySubject)) {

      subjectItems.sort((a, b) => a.rotation_order - b.rotation_order);

      const totalCycleSeconds = subjectItems.reduce((sum, i) => sum + i.duration * 60, 0);

      if (totalCycleSeconds === 0) {
        activePerSubject[subject] = subjectItems[0];
        continue;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const positionInCycle = nowSeconds % totalCycleSeconds;

      let elapsed = 0;
      let active = subjectItems[0];
      for (const item of subjectItems) {
        const slotSeconds = item.duration * 60;
        if (positionInCycle < elapsed + slotSeconds) {
          active = item;
          break;
        }
        elapsed += slotSeconds;
      }

      activePerSubject[subject] = active;
    }

    return activePerSubject;
  }

 
  
  static async getLiveContent(teacherId, subject = null) {
    const cacheKey = `live:${teacherId}:${subject || 'all'}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

  
    const liveItems = await ContentModel.findLiveByTeacher(teacherId, subject);

    if (!liveItems || liveItems.length === 0) {
      const empty = { available: false, message: 'No content available', data: null };
      await cacheSet(cacheKey, empty, 15); 
      return empty;
    }

    const activePerSubject = this.determineActiveContent(liveItems);

    let result;
    if (subject) {
     
      const active = activePerSubject[subject.toLowerCase()];
      if (!active) {
        result = { available: false, message: 'No content available for this subject', data: null };
      } else {
        result = { available: true, message: 'Content available', data: this.sanitize(active) };
      
        this._trackView(active.id, teacherId, active.subject).catch(() => {});
      }
    } else {
     
      const activeList = Object.values(activePerSubject).map(this.sanitize);
      if (activeList.length === 0) {
        result = { available: false, message: 'No content available', data: null };
      } else {
        result = { available: true, message: 'Content available', data: activeList };
      
        activeList.forEach((c) => this._trackView(c.id, teacherId, c.subject).catch(() => {}));
      }
    }

    await cacheSet(cacheKey, result, 15); 
    return result;
  }

  static sanitize(item) {
    const { file_path, rotation_order, slot_subject, ...safe } = item;
    return safe;
  }

  static async _trackView(contentId, teacherId, subject) {
    try {
      await AnalyticsModel.trackView(contentId, teacherId, subject);
     
      await cacheDelPattern('analytics:*');
    } catch (err) {
      logger.warn('Analytics tracking failed:', err.message);
    }
  }
}

module.exports = SchedulingService;
