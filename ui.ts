export const page = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mitarbeiter · HuH</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 720px; margin: 2rem auto; padding: 0 1rem;
      line-height: 1.5;
    }
    h1 { margin-bottom: 0.25rem; }
    p.sub { margin-top: 0; opacity: 0.65; }
    form.add { display: flex; gap: 0.5rem; margin: 1.25rem 0; flex-wrap: wrap; }
    input {
      padding: 0.5rem 0.6rem; border: 1px solid #8888; border-radius: 8px;
      font-size: 1rem; flex: 1; min-width: 120px;
    }
    button {
      padding: 0.5rem 0.9rem; border: 0; border-radius: 8px;
      font-size: 0.95rem; cursor: pointer;
    }
    button.primary { background: #2563eb; color: #fff; }
    button.ghost { background: #8882; }
    button.danger { background: #dc2626; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid #8883; }
    th { font-size: 0.8rem; text-transform: uppercase; opacity: 0.6; }
    td.actions { text-align: right; white-space: nowrap; }
    td.actions button { margin-left: 0.35rem; }
    .uuid { font-family: ui-monospace, monospace; font-size: 0.72rem; opacity: 0.5; }
    .row-input { width: 100%; }
    .empty { opacity: 0.6; font-style: italic; }
  </style>
</head>
<body>
  <h1>Mitarbeiter</h1>
  <p class="sub">Einfaches CRUD mit Bun + SQLite</p>

  <form class="add" id="add-form">
    <input id="add-name" placeholder="Name" autocomplete="off" required />
    <input id="add-role" placeholder="Rolle" autocomplete="off" required />
    <button class="primary" type="submit">Hinzufügen</button>
  </form>

  <table>
    <thead>
      <tr><th>Name</th><th>Rolle</th><th></th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>

  <script>
    const API = "/api/mitarbeiter";
    let editingId = null;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    async function load() {
      const list = await fetch(API).then((r) => r.json());
      const tbody = $("rows");
      tbody.innerHTML = "";
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty">Keine Mitarbeiter</td></tr>';
        return;
      }
      for (const m of list) {
        const tr = document.createElement("tr");
        if (m.id === editingId) {
          tr.innerHTML =
            '<td><input class="row-input" id="e-name" value="' + esc(m.name) + '" /></td>' +
            '<td><input class="row-input" id="e-role" value="' + esc(m.role) + '" /></td>' +
            '<td class="actions">' +
              '<button class="primary" data-save="' + m.id + '">Speichern</button>' +
              '<button class="ghost" data-cancel>Abbrechen</button>' +
            '</td>';
        } else {
          tr.innerHTML =
            '<td>' + esc(m.name) + '<br><span class="uuid">' + esc(m.id) + '</span></td>' +
            '<td>' + esc(m.role) + '</td>' +
            '<td class="actions">' +
              '<button class="ghost" data-edit="' + m.id + '">Bearbeiten</button>' +
              '<button class="danger" data-del="' + m.id + '">Löschen</button>' +
            '</td>';
        }
        tbody.appendChild(tr);
      }
    }

    $("add-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("add-name").value.trim();
      const role = $("add-role").value.trim();
      if (!name || !role) return;
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      $("add-name").value = "";
      $("add-role").value = "";
      load();
    });

    $("rows").addEventListener("click", async (e) => {
      const t = e.target;
      if (t.dataset.edit) { editingId = t.dataset.edit; return load(); }
      if (t.dataset.cancel !== undefined) { editingId = null; return load(); }
      if (t.dataset.del) {
        await fetch(API + "/" + t.dataset.del, { method: "DELETE" });
        return load();
      }
      if (t.dataset.save) {
        const name = $("e-name").value.trim();
        const role = $("e-role").value.trim();
        if (!name || !role) return;
        await fetch(API + "/" + t.dataset.save, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role }),
        });
        editingId = null;
        return load();
      }
    });

    load();
  </script>
</body>
</html>`;
