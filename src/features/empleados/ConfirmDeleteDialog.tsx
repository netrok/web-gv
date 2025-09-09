// src/features/empleados/ConfirmDeleteDialog.tsx
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material'

type Props = {
  open: boolean
  loading?: boolean
  title?: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteDialog({
  open,
  loading = false,
  title = 'Confirmar',
  description = '¿Seguro que deseas continuar?',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onCancel,
  onConfirm,
}: Props) {
  const handleClose = (_: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (loading) return
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') onCancel()
  }

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="confirm-delete-title">
      {title && <DialogTitle id="confirm-delete-title">{title}</DialogTitle>}

      {description && (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          autoFocus
        >
          {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
