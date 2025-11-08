import { type RouteConfig, index, route } from "@react-router/dev/routes";

const systemRoutes = [
  route("*", "routes/$.tsx"), // Wildcard route, handles all unmatched paths
] satisfies RouteConfig;

const pageRoutes = [
  index("routes/home.tsx"),
  route("agent/new", "routes/agent.new.tsx"),
  route("agent/:id", "routes/agent.$id.tsx"),
  route("me/agents", "routes/me.agents.tsx"),
] satisfies RouteConfig;

export default [...systemRoutes, ...pageRoutes] satisfies RouteConfig;
