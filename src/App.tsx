import { useState } from 'react'
import './App.css'
import { useSendMessage } from './hooks/sendMessage'
import type { Message } from './types/types'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

function App() {
  const sendMessage = useSendMessage()
  const [message, setMessage] = useState<Message>({
    text: '',
    decoration: null,
    size: 16,
    animation: null,
    link: '',
  })
  const [bearerToken, setBearerToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [isError, setIsError] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsError(false)
    setIsSubmitting(true)

    try {
      await sendMessage(message, bearerToken)
      setStatus('Message submitted.')
    } catch (error) {
      console.error(error)
      setIsError(true)
      setStatus(error instanceof Error ? error.message : 'Failed to submit message.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Box className="app-shell">
      <Paper elevation={4} className="message-card">
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          <Typography variant="h5" component="h1" color="black" textAlign="center">
            Send Rachael a Message
          </Typography>

          <TextField
            label="Text"
            value={message.text ?? ''}
            onChange={(event) =>
              setMessage((current) => ({ ...current, text: event.target.value }))
            }
            fullWidth
          />

          <TextField
            select
            label="Decoration"
            value={message.decoration ?? ''}
            onChange={(event) =>
              setMessage((current) => ({
                ...current,
                decoration:
                  event.target.value === ''
                    ? null
                    : (event.target.value as Message['decoration']),
              }))
            }
            fullWidth
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="italic">Italic</MenuItem>
            <MenuItem value="bold">Bold</MenuItem>
            <MenuItem value="underline">Underline</MenuItem>
          </TextField>

          <TextField
            label="Size"
            type="number"
            value={message.size ?? ''}
            onChange={(event) =>
              setMessage((current) => ({
                ...current,
                size: Number(event.target.value),
              }))
            }
            fullWidth
          />

          <TextField
            select
            label="Animation"
            value={message.animation ?? ''}
            onChange={(event) =>
              setMessage((current) => ({
                ...current,
                animation:
                  event.target.value === ''
                    ? null
                    : (event.target.value as Message['animation']),
              }))
            }
            fullWidth
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="hearts">Hearts</MenuItem>
            <MenuItem value="fireworks">Fireworks</MenuItem>
            <MenuItem value="stars">Stars</MenuItem>
          </TextField>

          <TextField
            label="Link"
            type="url"
            value={message.link ?? ''}
            onChange={(event) =>
              setMessage((current) => ({ ...current, link: event.target.value }))
            }
            fullWidth
          />

          <TextField
            label="Bearer Token"
            type="password"
            value={bearerToken}
            onChange={(event) => setBearerToken(event.target.value)}
            fullWidth
          />

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>

          {status ? (
            <Alert severity={isError ? 'error' : 'success'}>
              {status}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  )
}

export default App
