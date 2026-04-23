import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import { db } from '../db/connection.ts'
import { habits, habitTags } from '../db/schema.ts'
import { eq, and, desc } from 'drizzle-orm'

type CreateHabitBody = {
  name: string
  description?: string
  frequency: string
  targetCount?: string
  tagIds?: string[]
}

type UpdateHabitBody = {
  name?: string
  description?: string
  frequency?: string
  targetCount?: number
  tagIds?: string[]
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export const createHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateHabitBody
    const { name, description, frequency, targetCount, tagIds } = body
    const userId = req.user!.id

    const result = await db.transaction(async (tx) => {
      const [newHabit] = await tx
        .insert(habits)
        .values({
          userId,
          name,
          description: description ?? null,
          frequency,
          targetCount: targetCount != null ? Number(targetCount) : undefined,
        })
        .returning()

      if (isStringArray(tagIds) && tagIds.length > 0) {
        const habitTagValues = tagIds.map((tagId) => ({
          habitId: newHabit.id,
          tagId,
        }))

        await tx.insert(habitTags).values(habitTagValues)
      }

      return newHabit
    })

    res.status(201).json({
      message: 'Habit created',
      habit: result,
    })
  } catch (e) {
    console.error('Create habit error', e)
    res.status(500).json({ error: 'Failed to create habit' })
  }
}

export const getUserHabits = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userHabitsWithTags = await db.query.habits.findMany({
      where: eq(habits.userId, req.user!.id),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(habits.createdAt)],
    })

    const habitsWithTags = userHabitsWithTags.map((habit) => ({
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined,
    }))

    res.json({
      habits: habitsWithTags,
    })
  } catch (e) {
    console.error('Get habits error', e)
    res.status(500).json({ error: 'Failed to fetch habits' })
  }
}

export const updateHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id
    const body = req.body as UpdateHabitBody
    const { tagIds, ...updates } = body
    const userId = req.user!.id

    const result = await db.transaction(async (tx) => {
      const [updatedHabit] = await tx
        .update(habits)
        .set({ ...updates, updateAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()

      if (!updatedHabit) {
        res.status(401).end()
        throw new Error('UNAUTHORIZED')
      }

      if (isStringArray(tagIds)) {
        await tx.delete(habitTags).where(eq(habitTags.habitId, id))

        if (tagIds.length > 0) {
          const habitTagValues = tagIds.map((tagId) => ({
            habitId: id,
            tagId,
          }))

          await tx.insert(habitTags).values(habitTagValues)
        }
      }

      return updatedHabit
    })

    res.json({
      message: 'Habit was updated',
      habit: result,
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return
    console.error('Update habit error', e)
    res.status(500).json({ error: 'Failed to update habit' })
  }
}
