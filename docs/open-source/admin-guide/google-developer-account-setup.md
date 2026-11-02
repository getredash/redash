---
title: How to Create a Google Developers Project
---

1. Sign into the [API manager in the Google Cloud console](https://console.cloud.google.com/apis/credentials).
2. Likely you will need to create a new project in Google Cloud, so click `Create`.
   ![Create new project](/assets/images/docs/google_oauth_1.png)
3. Give your project a name, like "Redash" and click create.
   ![Give project name](/assets/images/docs/google_oauth2.png)
4. Click `Create Credentials` and select OAuth Client ID.
   ![Create credentials](/assets/images/docs/google_oauth3.png)
5. If you see it, click on the button that says `Configure Consent Screen`.
   ![Configure consent](/assets/images/docs/google_oauth4.png)
6. Fill out the Product Name field and click Save. (This will be displayed to users during the sign in flow).
   ![Fill out product name](/assets/images/docs/google_oauth5.png)
7. Select the Application Type `Web Application`. Give your application a name and in Authorized Javascript Origins, put the address of your Redash instance (something like: `https://redash.acme.com`).
8. In the Authorized redirect URIs section, put the address of your Redash instance suffixed by `/oauth/google_callback` (i.e. `https://redash.acme.com/oauth/google_callback`). Click create.
   ![Set callbacks](/assets/images/docs/google_oauth6.png)
9. Copy your client ID and secret and paste them in the fields on the left to finish connecting Google.
   ![Copy Client ID and Secret](/assets/images/docs/google_oauth7.png)
