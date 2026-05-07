import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { Today } from './pages/Today'
import { Archive } from './pages/Archive'
import { EpisodeDetail } from './pages/EpisodeDetail'
import { Notes } from './pages/Notes'
import { Ask } from './pages/Ask'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: 'archive', element: <Archive /> },
      { path: 'episode/:id', element: <EpisodeDetail /> },
      { path: 'notes', element: <Notes /> },
      { path: 'ask', element: <Ask /> },
    ],
  },
])
