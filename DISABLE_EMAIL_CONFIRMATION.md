# How to Disable Email Confirmation & Rate Limits

To fix the "Email rate limit exceeded" error and allow instant user creation, you must change a setting in your Supabase Dashboard.

### Steps:

1.  **Go to your Supabase Project Dashboard.**
2.  Click on the **Authentication** icon (Lock icon) in the left sidebar.
3.  Click on **Providers** in the inner sidebar.
4.  Select **Email**.
5.  **Turn OFF** the switch for **"Confirm email"**.
6.  (Optional but Recommended) **Turn OFF** "Secure email change".
7.  Click **Save**.

### Why is this needed?
By default, Supabase creates users in a "waiting for confirmation" state and tries to send them an email. If you create many users quickly (like an Admin would), Supabase stops you to prevent spam. Disabling this setting makes user creation instant and silent.
