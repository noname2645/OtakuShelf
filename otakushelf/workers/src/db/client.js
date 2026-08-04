import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

let cached = null

function getPrisma(env) {
  if (cached) return cached
  cached = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  }).$extends(withAccelerate())
  return cached
}

const MODELS = { users: 'user', animerists: 'animeList' }

function t(filter) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return filter
  const r = {}
  for (const [k, v] of Object.entries(filter)) {
    if (k === '_id') {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const mapped = {}
        for (const [op, val] of Object.entries(v)) {
          if (op === '$ne') mapped.not = val
          else mapped[op.replace('$', '')] = val
        }
        r.id = Object.keys(mapped).length ? mapped : v
      } else {
        r.id = v
      }
      continue
    }
    if (v && typeof v === 'object') {
      if ('$oid' in v) { r[k] = v.$oid; continue }
      if ('$gt' in v) { r[k] = {}; for (const [op, val] of Object.entries(v)) r[k][op.replace('$', '')] = val; continue }
      if ('$ne' in v) { r[k] = { not: v.$ne }; continue }
      const sub = t(v)
      r[k] = Object.keys(sub).length > 0 || !Array.isArray(v) && Object.keys(v).length > 0 ? sub : v
    } else {
      r[k] = v
    }
  }
  return r
}

function doc(result) {
  if (!result) return null
  if (Array.isArray(result)) return result.map(doc)
  return Object.defineProperty({ ...result, _id: result.id }, 'id', { enumerable: false })
}

function cloneJson(v) {
  if (v && typeof v === 'object') return structuredClone(v)
  return {}
}

function expandDotted(item, set) {
  const root = {}
  const dotted = []
  for (const [key, value] of Object.entries(set)) {
    if (key.includes('.')) dotted.push([key, value])
    else root[key] = value
  }
  for (const [key, value] of dotted) {
    const parts = key.split('.')
    let base = root[parts[0]]
    if (base === undefined) {
      base = cloneJson(item?.[parts[0]])
      root[parts[0]] = base
    }
    let ref = base
    for (let i = 1; i < parts.length - 1; i++) {
      if (!ref[parts[i]] || typeof ref[parts[i]] !== 'object') ref[parts[i]] = {}
      ref = ref[parts[i]]
    }
    ref[parts[parts.length - 1]] = value
  }
  return root
}

function model(prisma, name) {
  const m = MODELS[name]
  if (!m) throw new Error(`Unknown collection: ${name}`)
  return prisma[m]
}

export function createDb(env) {
  const prisma = getPrisma(env)

  return {
    oid: (id) => id,

    findOne: async (collection, filter) => {
      const m = model(prisma, collection)
      return doc(await m.findFirst({ where: t(filter) }))
    },

    find: async (collection, filter, opts = {}) => {
      const m = model(prisma, collection)
      return doc(await m.findMany({ where: t(filter), ...opts }))
    },

    insertOne: async (collection, data) => {
      const m = model(prisma, collection)
      const clean = {}
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && '$oid' in v) {
          clean[k] = v.$oid
        } else {
          clean[k] = v
        }
      }
      const result = await m.create({ data: clean })
      return { insertedId: result.id }
    },

    updateOne: async (collection, filter, update) => {
      const m = model(prisma, collection)
      const item = await m.findFirst({ where: t(filter) })
      if (!item) return { modifiedCount: 0 }

      if (update.$set) {
        await m.update({ where: { id: item.id }, data: expandDotted(item, update.$set) })
      } else if (update.$push) {
        const [field, value] = Object.entries(update.$push)[0]
        const arr = item[field] || []
        if (value && typeof value === 'object' && '$each' in value) {
          arr.push(...value.$each)
        } else {
          arr.push(value)
        }
        await m.update({ where: { id: item.id }, data: { [field]: arr } })
      } else if (update.$pull) {
        const [field, cond] = Object.entries(update.$pull)[0]
        const arr = (item[field] || []).filter(e => {
          for (const [k, v] of Object.entries(cond)) if (e[k] === v) return false
          return true
        })
        await m.update({ where: { id: item.id }, data: { [field]: arr } })
      } else if (update.$unset) {
        const field = Object.keys(update.$unset)[0]
        const current = await m.findFirst({ where: t(filter) })
        if (!current) return { modifiedCount: 0 }
        const keys = field.split('.')
        let obj = { ...current }
        let target = obj
        for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]]
        delete target[keys[keys.length - 1]]
        await m.update({ where: { id: current.id }, data: obj })
      } else {
        await m.update({ where: { id: item.id }, data: update })
      }

      return { modifiedCount: 1 }
    },

    deleteOne: async (collection, filter) => {
      const m = model(prisma, collection)
      const item = await m.findFirst({ where: t(filter) })
      if (!item) return 0
      await m.delete({ where: { id: item.id } })
      return 1
    },

    updateById: async (collection, id, update) => {
      const m = model(prisma, collection)
      const item = await m.findFirst({ where: { id } })
      if (update.$set) {
        await m.update({ where: { id }, data: expandDotted(item, update.$set) })
      }
      return { modifiedCount: 1 }
    },

    findOneAndUpdate: async (collection, filter, update, opts = {}) => {
      const m = model(prisma, collection)
      const item = await m.findFirst({ where: t(filter) })
      if (!item) return null
      const data = update.$set || update
      const expanded = data === update.$set ? expandDotted(item, update.$set) : data
      const result = opts.returnNewDocument !== false
        ? await m.update({ where: { id: item.id }, data: expanded })
        : item
      return doc(result)
    },
  }
}
