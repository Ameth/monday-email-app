**Autentication Code:**
[GET] https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?
client_id=***{token-id}***&
response_type=code&
redirect_uri=***{response-url}***&
response_mode=query&
scope=https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access&
state=12345


**Access token and refresh token:**
[POST] https://login.microsoftonline.com/common/oauth2/v2.0/token
client_id:***{token-id}***
scope:https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access
code:***{autentication-code}***
redirect_uri:***{response-url}***
grant_type:authorization_code
client_secret:***{client-secret}***