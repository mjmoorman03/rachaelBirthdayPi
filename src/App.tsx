import { useState } from "react";
import "./App.css";
import { useGetMessage, useSendMessage } from "./hooks/hooks";
import type { Message } from "./types/types";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const ICON_TEMPLATES = ["{{heart}}", "{{star}}", "{{note}}", "{{check}}", "{{arrow}}"];

const emptyMessage = (): Message => ({
  text: "",
  decoration: null,
  size: 16,
  style: "plain",
  animation: null,
  link: "",
});

function App() {
  const [message, setMessage] = useState<Message>(emptyMessage);
  const [bearerToken, setBearerToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const sendMessage = useSendMessage();
  const getMessage = useGetMessage();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setIsError(false);
    setIsSubmitting(true);

    try {
      await sendMessage(message, bearerToken);
      setStatus("Message submitted.");
    } catch (error) {
      console.error(error);
      setIsError(true);
      setStatus(
        error instanceof Error ? error.message : "Failed to submit message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLoadSaved = async () => {
    setStatus("");
    setIsError(false);
    setIsLoadingSaved(true);
    try {
      const saved = await getMessage(bearerToken);
      setMessage({ ...emptyMessage(), ...saved });
      setStatus("Loaded the saved message into the form.");
    } catch (error) {
      console.error(error);
      setIsError(true);
      setStatus(
        error instanceof Error ? error.message : "Failed to load message.",
      );
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const isBusy = isSubmitting || isLoadingSaved;

  return (
    <Box className="app-shell">
      <Paper
        elevation={3}
        sx={{
          p: "28px",
          width: "100%",
          maxWidth: "520px",
          borderRadius: "16px",
        }}
      >
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          <Typography
            variant="h5"
            component="h1"
            color="black"
            textAlign="center"
          >
            Send Rachael a Message
          </Typography>

          <TextField
            label="Text"
            value={message.text ?? ""}
            onChange={(event) => {
              const text = event.target.value;
              setMessage((current) => ({ ...current, text }));
            }}
            helperText={`Icons: ${ICON_TEMPLATES.join("  ")}`}
            fullWidth
          />

          <TextField
            select
            label="Style"
            value={message.style ?? "plain"}
            onChange={(event) => {
              const value = event.target.value;
              setMessage((current) => ({
                ...current,
                style: value === "" ? null : (value as Message["style"]),
              }));
            }}
            fullWidth
          >
            <MenuItem value="plain">Plain</MenuItem>
            <MenuItem value="centered">Centered</MenuItem>
            <MenuItem value="bubble">Bubble</MenuItem>
          </TextField>

          <TextField
            select
            label="Decoration"
            value={message.decoration ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setMessage((current) => ({
                ...current,
                decoration:
                  value === "" ? null : (value as Message["decoration"]),
              }));
            }}
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
            value={message.size ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const size = value === "" ? undefined : Number(value);
              setMessage((current) => ({ ...current, size }));
            }}
            fullWidth
          />

          <TextField
            select
            label="Animation"
            value={message.animation ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setMessage((current) => ({
                ...current,
                animation:
                  value === "" ? null : (value as Message["animation"]),
              }));
            }}
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
            value={message.link ?? ""}
            onChange={(event) => {
              const link = event.target.value;
              setMessage((current) => ({ ...current, link }));
            }}
            fullWidth
          />

          <TextField
            label="Bearer Token"
            type="password"
            value={bearerToken}
            onChange={(event) => setBearerToken(event.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isBusy}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              disabled={isBusy}
              onClick={onLoadSaved}
              sx={{
                borderWidth: 2,
                fontWeight: 600,
                borderColor: "primary.main",
                "&:hover": {
                  borderWidth: 2,
                },
              }}
            >
              {isLoadingSaved ? "Loading..." : "Load saved message"}
            </Button>
          </Stack>

          {status ? (
            <Alert severity={isError ? "error" : "success"}>{status}</Alert>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}

export default App;
