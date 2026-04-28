const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ContentModel = require('../models/content.model');
const ContentSlotModel = require('../models/contentSlot.model');
const ContentScheduleModel = require('../models/contentSchedule.model');
const { getFileUrl } = require('../middlewares/upload.middleware');
const { cacheDel, cacheDelPattern } = require('../config/redis');

class ContentService {

  static async upload({ title, description, subject, file, uploadedBy, startTime, endTime, rotationDuration }) {
    if (!file) throw Object.assign(new Error('File is required'), { statusCode: 400 });

    const fileUrl = getFileUrl(file.path);
    const contentId = uuidv4();


    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const content = await ContentModel.create({
      id: contentId,
      title,
      description,
      subject: subject.toLowerCase(),
      fileUrl,
      filePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      originalFilename: file.originalname,
      uploadedBy,
      startTime: formatDate(startTime),
      endTime: formatDate(endTime),
    });

   
    if (startTime && endTime) {
      const slot = await ContentSlotModel.findOrCreate(uploadedBy, subject.toLowerCase());
      const rotationOrder = await ContentScheduleModel.getNextRotationOrder(slot.id);
      await ContentScheduleModel.create({
        contentId,
        slotId: slot.id,
        rotationOrder,
        duration: rotationDuration || 5,
      });
    }

  
    await cacheDelPattern(`route:/api/content*`);
    return content;
  }

  static async approve(contentId, principalId) {
    const content = await ContentModel.findById(contentId);
    if (!content) throw Object.assign(new Error('Content not found'), { statusCode: 404 });
    if (content.status === 'approved') throw Object.assign(new Error('Already approved'), { statusCode: 400 });

    const updated = await ContentModel.approve(contentId, principalId);
    await cacheDelPattern(`route:/api/content*`);
    await cacheDelPattern(`live:*`);
    return updated;
  }

  static async reject(contentId, principalId, rejectionReason) {
    if (!rejectionReason?.trim()) {
      throw Object.assign(new Error('Rejection reason is required'), { statusCode: 400 });
    }
    const content = await ContentModel.findById(contentId);
    if (!content) throw Object.assign(new Error('Content not found'), { statusCode: 404 });

    const updated = await ContentModel.reject(contentId, principalId, rejectionReason);
    await cacheDelPattern(`route:/api/content*`);
    await cacheDelPattern(`live:*`);
    return updated;
  }
  static async list({ status, subject, teacherId, page = 1, limit = 10 }) {
    const [rows, total] = await Promise.all([
      ContentModel.findAll({ status, subject, teacherId, page, limit }),
      ContentModel.countAll({ status, subject, teacherId }),
    ]);
    return { rows, total };
  }

  static async getById(contentId) {
    const content = await ContentModel.findById(contentId);
    if (!content) throw Object.assign(new Error('Content not found'), { statusCode: 404 });
    return content;
  }

  static async delete(contentId, requesterId, requesterRole) {
    const content = await ContentModel.findById(contentId);
    if (!content) throw Object.assign(new Error('Content not found'), { statusCode: 404 });

    if (requesterRole === 'teacher' && content.uploaded_by !== requesterId) {
      throw Object.assign(new Error('Cannot delete another teacher\'s content'), { statusCode: 403 });
    }

  
    if (content.file_path && fs.existsSync(content.file_path)) {
      fs.unlinkSync(content.file_path);
    }

    await ContentScheduleModel.deleteByContent(contentId);
    await ContentModel.delete(contentId);

    await cacheDelPattern(`route:/api/content*`);
    await cacheDelPattern(`live:*`);
    return true;
  }
}

module.exports = ContentService;
