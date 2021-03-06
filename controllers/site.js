const url = require('url')

const createError = require('http-errors')
const { Category, Goods, GoodsPics } = require('../models')

const getPageLink = (current, page) => {
  const urlObj = url.parse(current, true)
  urlObj.query.page = page
  delete urlObj.search // !!!
  return url.format(urlObj)
}

exports.index = (req, res) => {
  res.render('site/index', { title: '首页' })
}

exports.list = (req, res, next) => {
  if (isNaN(req.params.id)) return next(createError(404))

  // 获取 URL 中分类 ID
  const catId = parseInt(req.params.id)

  let { page = 1, order = 'upd_time' } = req.query
  page = parseInt(page) || 1
  res.locals.page = page

  const limit = 20
  const offset = (page - 1) * limit
  const where = { is_del: '0' }

  // 查询当前分类信息
  Category.findOne({ where: { cat_id: catId } })
    .then(category => {
      // 未找到分类 404
      if (!category) throw createError(404, '未找到对应分类')

      // 挂载分类信息到视图
      res.locals.category = category

      switch (category.cat_level) {
        case 0:
          where.cat_one_id = catId
          break
        case 1:
          where.cat_two_id = catId
          break
        case 2:
          where.cat_three_id = catId
          break
        default:
          where.cat_id = catId
          break
      }

      return Goods.count({ where })
    })
    .then(count => {
      res.locals.total = count
      res.locals.totalPages = Math.ceil(count / limit)

      // if (res.locals.totalPages < page) {
      //   throw createError(404, '未找到该分类对应的商品数据')
      // }

      const urlObj = url.parse(req.url, true)
      urlObj.query.page = '*p'
      delete urlObj.search // !!!
      res.locals.pageLinkFormat = url.format(urlObj)

      // 查询当前分类下的全部商品信息
      return Goods.findAll({
        where: where,
        order: [[order, 'DESC']],
        offset: offset,
        limit: limit
      })
    })
    .then(goods => {
      // 挂载商品信息到视图
      res.locals.goods = goods

      // 渲染页面
      res.render('site/list', { title: '列表页' })
    })
    .catch(next)
}

exports.item = (req, res, next) => {
  if (isNaN(req.params.id)) return next(createError(404))

  Goods.findOne({ where: { goods_id: req.params.id } })
    .then(goods => {
      if (!goods) throw createError(404, '未找到对应商品')
      res.locals.goods = goods

      return GoodsPics.findAll({ where: { goods_id: goods.goods_id} })
    })
    .then(images => {
      res.locals.images = images

      return Category.findOne({ where: { cat_id: res.locals.goods.cat_id } })
    })
    .then(category => {
      res.locals.category = category

      res.render('site/item', { title: '详细页', product: req.params.id })
    })
    .catch(next)
}
