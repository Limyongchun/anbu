import { Route, Switch, Redirect } from "wouter";
import { ProjectStoreProvider, useStore } from "@/store/projectStore";
import HomePage from "@/pages/HomePage";
import CreateProjectPage from "@/pages/CreateProjectPage";
import StylePage from "@/pages/StylePage";
import EditorPage from "@/pages/EditorPage";
import PreviewPage from "@/pages/PreviewPage";

function AppRoutes() {
  const { state } = useStore();

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/create" component={CreateProjectPage} />
      <Route path="/style">
        {state.currentProjectId ? (
          <StylePage />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      <Route path="/project/:id/style" component={StylePage} />
      <Route path="/project/:id/editor" component={EditorPage} />
      <Route path="/project/:id/preview" component={PreviewPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ProjectStoreProvider>
      <AppRoutes />
    </ProjectStoreProvider>
  );
}
