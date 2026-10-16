export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const palette = ['#4e8caf', '#8e79b5', '#b47b60', '#5b968b', '#997a9c']
  const initials = name.startsWith('+') ? name.slice(-2) : name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <span className={`avatar${large ? ' avatar-large' : ''}`} style={{ background: palette[hash % palette.length] }} aria-hidden="true">{initials}</span>
}
