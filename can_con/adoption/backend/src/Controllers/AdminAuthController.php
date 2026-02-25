<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Security\Csrf;
use App\Services\AdminAuthService;

final class AdminAuthController
{
    public function __construct(private AdminAuthService $auth, private bool $debug) {}

    public function loginForm(Request $req): Response
    {
        $csrf = Csrf::token();
        $hint = $this->debug ? "<div style='margin-top:10px;color:#9fb3d9'>DEV LOGIN: admin@example.com / admin123</div>" : "";

        $html = "
<!doctype html>
<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>
<title>Admin Login</title>
<style>
  body{margin:0;background:#0b1220;color:#e6eefc;font-family:Arial}
  .wrap{max-width:420px;margin:70px auto;padding:18px}
  .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px}
  input{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#0f172a;color:#e6eefc}
  button{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(96,165,250,0.25);background:rgba(96,165,250,0.12);color:#e6eefc;font-weight:700;cursor:pointer}
</style>
</head>
<body>
  <div class='wrap'>
    <div class='card'>
      <h2>Admin Login</h2>
      <form method='post' action='/admin/login'>
        <input type='hidden' name='_csrf' value='{$csrf}' />
        <label>Email</label><br/><input name='email' /><br/><br/>
        <label>Password</label><br/><input type='password' name='password' /><br/><br/>
        <button type='submit'>Sign in</button>
      </form>
      {$hint}
    </div>
  </div>
</body>
</html>";
        return Response::html($html);
    }

    public function login(Request $req): Response
    {
        $email = (string)($req->body['email'] ?? '');
        $password = (string)($req->body['password'] ?? '');

        if ($this->auth->login($email, $password)) {
            return Response::redirect('/admin/ui');
        }

        return Response::html("<p style='color:#e6eefc;background:#0b1220;font-family:Arial;padding:22px'>Login failed. <a style='color:#60a5fa' href='/admin/login'>Try again</a></p>", 401);
    }

    public function logout(Request $req): Response
    {
        $this->auth->logout();
        return Response::redirect('/admin/login');
    }
}
