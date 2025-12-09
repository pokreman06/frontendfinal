import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import ImagePreferencesPage from "./pages/image_preferences_page";
import QueryThemesPage from "./pages/QueryThemesPage";
import SourceMaterialsPage from "./pages/SourceMaterialsPage";
import FacebookPostPage from "./pages/FacebookPostPage";
import ChatPage from "./pages/ChatPage";
import ToolCallsPage from "./pages/ToolCallsPage";
// import ToolSettingsPage from "./pages/ToolSettingsPage";
import { PostProvider } from "./context/PostContext";
import ToolUsageDisplay from "./components/ToolUsageDisplay";

function App() {
  // Temporarily skip authentication to display main page
  return (
    <PostProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="query-themes" element={<QueryThemesPage/>} />
            <Route path="source-materials" element={<SourceMaterialsPage/>} />
            <Route path="imagepreference" element={<ImagePreferencesPage/>} />
            <Route path="facebook-post" element={<FacebookPostPage/>} />
            <Route path="chat" element={<ChatPage/>} />
            <Route path="tool-calls" element={<ToolCallsPage/>} />
            {/* <Route path="tool-settings" element={<ToolSettingsPage/>} /> */}
            <Route path="tool-usage-display" element={<PostProvider><ToolUsageDisplay toolCalls={[{name: "gaybacon", arguments:{}, result: "yay" }]} /></PostProvider>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PostProvider>
  );
}

export default App;