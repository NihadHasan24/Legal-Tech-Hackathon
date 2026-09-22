import { Counter } from '../models/index.js'

export async function nextRecordId(prefix) {
  const year = new Date().getUTCFullYear()
  const counter = await Counter.findOneAndUpdate(
    { key: `${prefix}-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return `${prefix}-${year}-${String(counter.value).padStart(6, '0')}`
}
