import express from 'express'
import authRoutes from './routes/authRoutes.ts'
import userRoutes from './routes/userRoutes.ts'
import habitRoutes from './routes/habitRoutes.ts'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import type { RequestHandler } from 'express'
import { isTest } from '../env.ts'
import { authenticateToken } from './middleware/auth.ts'
import { APIError, errorHandler } from './middleware/errorHandler.ts'

const app = express()
//app.use(helmet())
app.use((helmet as (options?: object) => RequestHandler)())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  morgan('dev', {
    skip: () => isTest(),
  }),
)

/* app.use((_, __, next) => {
  next(new APIError('validation error', 'ValidationError', 400))
}) */

app.get('/health', (req, res) => {
  res.send('ok')
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/habits', habitRoutes)

app.use(errorHandler)

export { app }

export default app
