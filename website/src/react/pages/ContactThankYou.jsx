import React from 'react'
import Layout from 'components/Layout'

const ContactThankYouPage = ({ location }) => (
  <Layout title="Contact Redash" location={location}>
    <section className="section">
      <div className="container text-center">
        <h1>Your message is on the way...</h1>

        <p>Thank you for getting in touch.</p>
      </div>
    </section>
  </Layout>
)

export default ContactThankYouPage
