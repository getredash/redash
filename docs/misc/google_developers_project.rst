How To: Create a Google Developers Project
==========================================

1. Go to the `Google Developers
   Console <https://console.developers.google.com/>`__.
2. Select a project, or create a new one by clicking Create Project:

   1. In the Project name field, type in a name for your project.
   2. In the Project ID field, optionally type in a project ID for your
      project or use the one that the console has created for you. This
      ID must be unique world-wide.
   3. Click the **Create** button and wait for the project to be
      created.
   4. Click on the new project name in the list to start editing the
      project.

3. In the left sidebar, select the **APIs** item below "APIs & auth". A
   list of Google web services appears.
4. Find the **Google+ API** service and set its status to **ON**—notice
   that this action moves the service to the top of the list.
5. In the sidebar under "APIs & auth", select **Credentials** and in that screen choose the **OAuth consent screen** tab

   -  Choose an Email Address and specify a Product Name.

6. In the sidebar under "APIs & auth", select **Credentials**.
7. Click **Add Credentials** button and choose **OAuth 20 Client ID**. 

   -  In the **Application type** section of the dialog, select **Web
      application**.
   -  In the **Authorized JavaScript origins** field, enter the origin
      for your app. You can enter multiple origins to use with multiple
      re:dash instance. Wildcards are not allowed. In the example below,
      we assume your re:dash instance address is *redash.example.com*:

   ::

       http://redash.example.com
       https://redash.example.com

   -  In the Authorized redirect URI field, enter the redirect URI
      callback:

   ::

       http://redash.example.com/oauth/google_callback

   -  Click the ``Create`` button.

8. In the resulting **Client ID for web application** section, copy the
   **Client ID** and **Client secret** to your ``.env`` file.
