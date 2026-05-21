import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModalProvider, SettingsModalProvider } from './contexts/ModalContext';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import PostEditor from './pages/PostEditor';
import Digest from './pages/Digest';
import DigestPost from './pages/DigestPost';
import Search from './pages/Search';
import UserProfile from './pages/UserProfile';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import AuthModal from './components/modals/AuthModal';
import SettingsModal from './components/modals/SettingsModal';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
