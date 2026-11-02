import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'

// The Netlify Forms contact form was replaced by a link to GitHub Discussions
// (no backend to run). The page keeps its layout and copy otherwise.
const ContactForm = () => (
  <p>
    <Link
      to="https://github.com/getredash/redash/discussions"
      className="btn btn-primary btn-lg btn-block"
    >
      Open GitHub Discussions
    </Link>
  </p>
)

const ContactPage = ({ location }) => (
  <Layout title="Contact Redash" location={location}>
    <section className="section">
      <div className="container">
        <h1 className="text-center">
          👋
          <br />
          Hey Redash
        </h1>

        <div className="row">
          <div className="col-md-6 col-md-offset-3">
            <div className="bs-callout bs-callout-primary">
              <p>
                For questions, support and general inquiries, please use our{' '}
                <Link to="https://github.com/getredash/redash/discussions">
                  GitHub Discussions
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-6 col-sm-offset-3 col-md-4 col-md-offset-4">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  </Layout>
)

export default ContactPage
