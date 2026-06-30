import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import {
  AuthModalProvider,
  SettingsModalProvider,
} from "./contexts/ModalContext";
import { FollowedTopicsProvider } from "./contexts/FollowedTopicsContext";
import { NavigationHistoryProvider } from "./contexts/NavigationHistoryContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastStack, WelcomePill } from "./components/ui/Toast";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import PostDetail from "./pages/PostDetail";
import PostEditor from "./pages/PostEditor";
import Digest from "./pages/Digest";
import Topic from "./pages/Topic";
import DigestPost from "./pages/DigestPost";
import Search from "./pages/Search";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthModal from "./components/modals/AuthModal";
import SettingsModal from "./components/modals/SettingsModal";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
       <NavigationHistoryProvider>
        <AuthProvider>
          <FollowedTopicsProvider>
            <AuthModalProvider>
              <SettingsModalProvider>
                <Routes>
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Home />} />
                    <Route path="post/new" element={<PostEditor />} />
                    <Route path="post/:id/edit" element={<PostEditor />} />
                    <Route path="post/:id" element={<PostDetail />} />
                    <Route path="digest" element={<Digest />} />
                    <Route path="digest/:date" element={<DigestPost />} />
                    <Route path="topics" element={<Topic />} />
                    <Route path="search" element={<Search />} />
                    <Route path="profile/:username" element={<UserProfile />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
                <AuthModal />
                <SettingsModal />
              </SettingsModalProvider>
            </AuthModalProvider>
          </FollowedTopicsProvider>
        </AuthProvider>
       </NavigationHistoryProvider>
       <ToastStack />
       <WelcomePill />
      </ToastProvider>
    </BrowserRouter>
  );
}
