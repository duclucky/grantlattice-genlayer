export function IntegratePage() {
  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">One canonical read boundary</p>
        <h1>Protect your execution boundary</h1>
        <p>Read finalized authority before a delegated task or protected tool call.</p>
      </header>
      <div className="integration-grid">
        <article className="content-card">
          <p className="kicker">A2A</p>
          <h2>AgentSkill admission</h2>
          <p>Check the delegated grant before another agent executes the requested skill.</p>
          <code className="code-block">can_invoke(grant_id, skill_id, resource_id)</code>
        </article>
        <article className="content-card">
          <p className="kicker">MCP</p>
          <h2>tools/call proxy</h2>
          <p>Fail closed before forwarding a protected tool request to the MCP server.</p>
          <code className="code-block">can_invoke(grant_id, tool_id, resource_id)</code>
        </article>
        <article className="content-card">
          <p className="kicker">Google ADK</p>
          <h2>AgentTool guard</h2>
          <p>Verify effective authority in the pre-execution guard for an agent-as-tool.</p>
          <code className="code-block">is_effective(grant_id)</code>
        </article>
      </div>
      <aside className="boundary-note">
        These are stable integration patterns, not claims that external protocol
        adapters or automatic execution are deployed in v1.
      </aside>
    </div>
  );
}
