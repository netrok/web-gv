import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteEmpleado } from './api'

/**
 * Elimina un empleado con:
 * - update optimista en todas las listas en cache (queries que empiezan con ['empleados'])
 * - invalidate Queries al finalizar
 */
export function useDeleteEmpleado() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => deleteEmpleado(id),

    onMutate: async (id) => {
      // Cancela cualquier refetch en curso de listas
      await qc.cancelQueries({ queryKey: ['empleados'], exact: false })

      // Guarda snapshots de todas las listas para revertir si falla
      const snapshots = qc.getQueriesData<any>({ queryKey: ['empleados'] })

      // Update optimista: saca el registro de todas las listas
      snapshots.forEach(([key, data]) => {
        if (!data) return
        if (Array.isArray(data)) {
          // Si alguna lista es un array simple
          qc.setQueryData(
            key,
            data.filter((e: any) => (e?.id ?? e?.num_empleado) !== id),
          )
        } else if (Array.isArray(data?.items)) {
          // Si es nuestro shape { items, total, next, previous }
          qc.setQueryData(key, {
            ...data,
            items: data.items.filter((e: any) => (e?.id ?? e?.num_empleado) !== id),
            total:
              typeof data.total === 'number' ? Math.max(data.total - 1, 0) : data.total,
          })
        }
      })

      return { snapshots }
    },

    onError: (_err, _id, ctx) => {
      // Revertir si falló
      if (!ctx?.snapshots) return
      ctx.snapshots.forEach(([key, snap]) => {
        qc.setQueryData(key, snap)
      })
    },

    onSettled: () => {
      // Revalidar todo al final
      qc.invalidateQueries({ queryKey: ['empleados'], exact: false })
    },
  })
}
