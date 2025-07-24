/ ─────────────────────────────────────────────────────────────
/  QuantCanvas WebSocket server
/ ─────────────────────────────────────────────────────────────

/ 1 · WebSocket handlers
.z.wo:{0N!"[INFO] WebSocket opened: ",string x}
.z.wc:{0N!"[INFO] WebSocket closed: ",string x}
.z.ws:{[qtxt]
  0N!"[QUERY] Received: ",qtxt;
  / naive sandbox – replace with your own
  result: @[value; qtxt; {[e] 0N!"[ERROR] ",e; (`error`msg)!(`ExecutionError;e)}];
  / ensure JSON‑safe
  safeResult: @[.j.j; result; {[e] (`error`msg)!(`JSONError;e)}];
  neg[.z.w] safeResult }

/ 2 · Reset function
resetServer:{[]
  protected:`q`Q`h`j`o`mouseX`mouseY`resetServer;
  deleted_total:0;
  cleared_namespaces:();

  / -------- root ----------
  root_to_delete: (system"v .") except protected;
  {[v] delete v from `.;} each root_to_delete;
  deleted_total+: count root_to_delete;

  / -------- namespaces ----------
  nsList: key `.;            / e.g. `.z` `.h` `.Q`
  nsList: nsList where 99=type each value each nsList;    / keep only dictionaries

  {                             / anonymous iter over namespaces
    nsSym:x;
    nsVars: system "v ",string nsSym;
    if[count nsVars;
      {[n;v] delete v from n} [nsSym] each nsVars;
      deleted_total+: count nsVars;        / explicit global update
      cleared_namespaces,: nsSym];
  } each nsList;

  .Q.gc[];

  (`status`message`deleted`namespaces_cleared`remaining_root)!
    (`success;"Server reset complete";deleted_total;cleared_namespaces;system"v .")
 };


