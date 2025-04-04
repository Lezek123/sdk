import { consts } from '../consts'

export const GhLink = ({ to, text }: { to: string; text?: string }) => (
  <a
    href={`${consts.gh.linkBaseUrl}/${to.replace(/^\//, '')}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <code>{to || text}</code>
  </a>
)
