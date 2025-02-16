const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Coach')

function isUndefined (value) {
  return value === undefined
}

function isNotValidSting (value) {
  return typeof value !== 'string' || value.trim().length === 0 || value === ''
}

router.get('/', async (req, res, next) => {
  try {
    const per = parseInt(req.query.per) || 10
    const page = parseInt(req.query.page) || 1
    // 確保 per 和 page 是有效數字
    if (isNaN(per) || isNaN(page) || per <= 0 || page <= 0) {
      return res.status(400).json({ error: 'Invalid per or page number' });
    }
    // 計算 offset（跳過的筆數）
    const skip = (page - 1) * per

    const coachRepository = dataSource.getRepository('Coach')
    // 先取得總數
    const total = await coachRepository.count()
    
    const coaches = await coachRepository.find({
      relations: ['User'],
      take: per, // 限制回傳筆數
      skip: skip, // 跳過前面筆數
    })
    const formattedCoaches = coaches.map(coach => ({
      id: coach.id,
      name: coach?.User?.name || null
    }))
    res.status(200).json({
      total,// 總筆數
      page,// 當前頁數
      per,// 每頁筆數
      totolPages: Math.ceil(total / per),// 總頁數
      data: formattedCoaches// 教練列表（只包含 id 和 name）
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
})

router.get('/:coachId', async (req, res, next) => {
  try {
    const coachId = req.params.coachId
    if (isUndefined(coachId) || isNotValidSting(coachId)) {
      logger.warn('欄位未填寫正確')
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
      return
    }
    const coachRepository = dataSource.getRepository('Coach')
    const existingCoach = await coachRepository.findOne({
      where: { id: coachId },
      relations: ['User']
    })
    if (!existingCoach) {
      logger.warn('找不到該教練')
      res.status(400).json({
        status: 'failed',
        message: '找不到該教練'
      })
      return
    }
    const { id, user_id, experience_years, description, profile_image_url, created_at, updated_at, User: user } = existingCoach
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: user.name || null,
          role: user.role || null
        },
        coach: {
          id,
          user_id,
          experience_years,
          description,
          profile_image_url, 
          created_at,
          updated_at
        }
      }
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
})

module.exports = router