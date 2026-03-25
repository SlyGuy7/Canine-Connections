<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Security\Csrf;
use App\Services\AdminService;
use App\Services\ApplicationService;
use App\Util\Logger;

final class AdminUiController
{
    public function __construct(
        private AdminService $admin,
        private ApplicationService $apps,
        private Logger $logger,
        private bool $debug
    ) {}

    public function dashboard(Request $req): Response
    {
        $overview = $this->admin->overview();
        $applications = $this->apps->list();
        $csrf = Csrf::token();

        $rows = '';
        foreach ($applications as $app) {
            $id = htmlspecialchars((string)$app['id']);
            $name = htmlspecialchars((string)$app['name']);
            $status = htmlspecialchars((string)$app['status']);
            $createdAt = htmlspecialchars((string)($app['createdAt'] ?? ''));

            $badge = match($status) {
                'approved' => "<span class='badge ok'>APPROVED</span>",
                'rejected' => "<span class='badge bad'>REJECTED</span>",
                default => "<span class='badge warn'>PENDING</span>",
            };

            $rows .= "
              <tr>
                <td class='mono'>{$id}</td>
                <td>{$name}</td>
                <td>{$badge}</td>
                <td class='mono'>{$createdAt}</td>
                <td class='actions'>
                  <form method='post' action='/admin/applications/{$id}/approve'>
                    <input type='hidden' name='_csrf' value='{$csrf}' />
                    <button class='btn btn-ok' type='submit'>Approve</button>
                  </form>
                  <form method='post' action='/admin/applications/{$id}/reject'>
                    <input type='hidden' name='_csrf' value='{$csrf}' />
                    <button class='btn btn-bad' type='submit'>Reject</button>
                  </form>
                </td>
              </tr>
            ";
        }

        $logsHtml = '';
        if ($this->debug) {
            $tail = $this->logger->tail(25);
            $safe = htmlspecialchars(implode("\n", $tail));
            $logsHtml = "
              <div class='panel'>
                <div class='panel-title'>Debug Panel</div>
                <div class='small muted'>Request ID: <span class='mono'>{$req->requestId}</span></div>
                <pre class='logs'>{$safe}</pre>
              </div>
            ";
        }

        $html = "
<!doctype html>
<html>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Admin Dashboard</title>
  <style>
    :root {
      --bg: #0b1220;
      --panel: #111b2e;
      --panel2: #0f172a;
      --text: #e6eefc;
      --muted: #9fb3d9;
      --line: rgba(255,255,255,0.08);
      --ok: #22c55e;
      --bad: #ef4444;
      --warn: #f59e0b;
      --accent: #60a5fa;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: var(--bg); color: var(--text); }
    a { color: inherit; text-decoration: none; }
    .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
    .sidebar { background: linear-gradient(180deg, #0f1a31 0%, #0b1220 100%); border-right: 1px solid var(--line); padding: 18px; }
    .brand { display:flex; gap:10px; align-items:center; margin-bottom: 18px; }
    .logo { width: 40px; height: 40px; border-radius: 12px; background: radial-gradient(circle at top left, var(--accent), #1d4ed8); box-shadow: 0 12px 40px rgba(96,165,250,.25); }
    .brand h1 { font-size: 16px; margin:0; }
    .nav { display:flex; flex-direction:column; gap:8px; margin-top: 14px; }
    .nav a { padding: 10px 12px; border-radius: 12px; color: var(--muted); border: 1px solid transparent; }
    .nav a:hover { border-color: var(--line); background: rgba(255,255,255,0.03); color: var(--text); }
    .nav a.active { background: rgba(96,165,250,0.12); color: var(--text); border-color: rgba(96,165,250,0.25); }
    .content { padding: 22px; }
    .topbar { display:flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .title { font-size: 22px; margin:0; }
    .pill { display:inline-flex; align-items:center; gap:8px; padding: 8px 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); border-radius: 999px; color: var(--muted); }
    .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--ok); box-shadow: 0 0 0 4px rgba(34,197,94,0.15); }
    .grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 14px 0 18px; }
    .card { background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)); border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
    .card .k { color: var(--muted); font-size: 12px; }
    .card .v { font-size: 22px; margin-top: 6px; }
    .panel { background: rgba(255,255,255,0.03); border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
    .panel-title { font-weight: 700; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
    th, td { padding: 12px; border-bottom: 1px solid var(--line); text-align: left; }
    th { color: var(--muted); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #cfe0ff; }
    .badge { display:inline-block; font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--line); }
    .badge.ok { background: rgba(34,197,94,0.12); color: #b8f7cd; border-color: rgba(34,197,94,0.25); }
    .badge.bad { background: rgba(239,68,68,0.12); color: #ffd0d0; border-color: rgba(239,68,68,0.25); }
    .badge.warn{ background: rgba(245,158,11,0.12); color: #ffe2b4; border-color: rgba(245,158,11,0.25); }
    .actions { display:flex; gap:10px; }
    .btn { cursor:pointer; border:1px solid var(--line); border-radius: 12px; padding: 10px 12px; font-weight: 700; color: var(--text); background: rgba(255,255,255,0.03); }
    .btn:hover { background: rgba(255,255,255,0.06); }
    .btn-ok { border-color: rgba(34,197,94,0.25); }
    .btn-bad { border-color: rgba(239,68,68,0.25); }
    .small { font-size: 12px; }
    .muted { color: var(--muted); }
    .logs { max-height: 260px; overflow:auto; background: rgba(0,0,0,0.3); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: sticky; top: 0; z-index: 5; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div class='layout'>
    <aside class='sidebar'>
      <div class='brand'>
        <div class='logo'></div>
        <div>
          <h1>Adoption Admin</h1>
          <div class='small muted'>Lifecycle Dashboard</div>
        </div>
      </div>

      <nav class='nav'>
        <a class='active' href='/admin/ui'>Dashboard</a>
        <a href='/admin/ui/new-application'>Create Test Application</a>
        <a href='/admin/ui/logs'>System Logs</a>
        <a href='/admin/logout'>Logout</a>
      </nav>

      <div style='margin-top:16px' class='panel'>
        <div class='panel-title'>System</div>
        <div class='pill'><span class='dot'></span> {$overview['systemStatus']}</div>
        <div class='small muted' style='margin-top:10px'>Debug: " . ($this->debug ? "ON" : "OFF") . "</div>
      </div>
    </aside>

    <main class='content'>
      <div class='topbar'>
        <h2 class='title'>Admin Dashboard</h2>
        <div class='pill'><span class='mono'>RID:</span> <span class='mono'>{$req->requestId}</span></div>
      </div>

      <section class='grid'>
        <div class='card'><div class='k'>Total Applications</div><div class='v'>{$overview['totalApplications']}</div></div>
        <div class='card'><div class='k'>Pending</div><div class='v'>{$overview['pending']}</div></div>
        <div class='card'><div class='k'>Approved</div><div class='v'>{$overview['approved']}</div></div>
        <div class='card'><div class='k'>Rejected</div><div class='v'>{$overview['rejected']}</div></div>
      </section>

      <section class='panel'>
        <div class='panel-title'>Applications</div>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {$rows}
          </tbody>
        </table>
      </section>

      <div style='height:14px'></div>
      {$logsHtml}
    </main>
  </div>
</body>
</html>
";

        return Response::html($html);
    }

    public function logs(Request $req): Response
    {
        $tail = $this->logger->tail(200);
        $safe = htmlspecialchars(implode("\n", $tail));
        $html = "<pre style='white-space:pre-wrap;background:#0b1220;color:#e6eefc;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);max-width:1100px;margin:20px auto'>{$safe}</pre>";
        return Response::html($html);
    }

    public function newApplicationForm(Request $req): Response
    {
        $csrf = Csrf::token();
        $html = "
        <html><body style='font-family:Arial;background:#0b1220;color:#e6eefc;padding:22px'>
          <h2>Create Test Application</h2>
          <form method='post' action='/admin/ui/new-application'>
            <input type='hidden' name='_csrf' value='{$csrf}' />
            <div><label>Name</label><br/><input name='name' style='padding:10px;width:320px' /></div><br/>
            <div><label>Address</label><br/><input name='address' style='padding:10px;width:520px' /></div><br/>
            <div><label>Phone</label><br/><input name='phone' style='padding:10px;width:220px' /></div><br/>
            <div><label>Experience</label><br/><input name='experience' style='padding:10px;width:520px' /></div><br/>
            <button type='submit' style='padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:#111b2e;color:#e6eefc'>Create</button>
          </form>
          <p><a href='/admin/ui' style='color:#60a5fa'>Back</a></p>
        </body></html>";
        return Response::html($html);
    }

    public function createApplication(Request $req): Response
    {
        $created = $this->apps->submit($req->body);
        return Response::redirect('/admin/ui');
    }
}
