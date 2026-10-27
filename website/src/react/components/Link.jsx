import React from 'react'

// Gatsby's <Link> rendered a plain <a>; the old click tracking was Segment-only
// and has been dropped. `activeClassName` is accepted and ignored for parity.
export default function Link({ children, to, activeClassName, ...other }) {
  return (
    <a href={to} {...other}>
      {children}
    </a>
  )
}
