interface Props { message: string | null }

export function Toast({ message }: Props) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20,
      background: '#2d5a8e', color: '#e0e0e0',
      padding: '12px 20px', borderRadius: 8,
      fontSize: 14, zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}
