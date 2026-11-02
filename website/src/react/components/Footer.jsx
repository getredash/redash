import React from 'react'
import footerLinks from 'data/footer_links.json'
import Link from 'components/Link'

const Footer = ({
  data: {
    allFooterLinksYaml: { edges },
  },
}) => (
  <footer className="footer">
    <div className="container">
      <div className="row">
        {edges.map(({ node }) => (
          <div
            className="col-xs-4 col-md-2 col-sm-3 footer__item"
            key={node.name}
          >
            <h3 className="footer__title">{node.name}</h3>
            <ul className="footer__list">
              {node.links.map((link) => (
                <li className="footer__list-item" key={link.name}>
                  <Link
                    data-track
                    data-track-location="footer"
                    to={link.url}
                    className="footer__list-link"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col-lg-4 col-lg-offset-2 col-md-5 col-md-offset-1 col-sm-3 footer__item--other text-right">
          <ul className="footer__list footer__list--social">
            <li className="footer__list-item">
              <Link
                to="https://github.com/getredash"
                className="footer__list-link"
              >
                <i className="fa fa-github-square" aria-hidden="true" />
              </Link>
            </li>
            <li className="footer__list-item">
              <Link
                to="https://twitter.com/getredash"
                className="footer__list-link"
              >
                <i className="fa fa-twitter-square" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
)

export default (props) => (
  <Footer
    data={{
      allFooterLinksYaml: { edges: footerLinks.map((node) => ({ node })) },
    }}
    {...props}
  />
)
