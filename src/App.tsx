import { useState, useEffect } from 'react';
import { Folder, File, Plus, Save } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  type: 'folder' | 'file';
  children: Project[];
  content?: string;
}

const initialProjects: Project[] = [
  { id: 1, name: 'My Novel', type: 'folder', children: [
    { id: 2, name: 'Manuscript', type: 'folder', children: [
      { id: 3, name: 'Chapter 1', type: 'file', children: [], content: '' },
      { id: 4, name: 'Chapter 2', type: 'file', children: [], content: '' },
    ]},
    { id: 5, name: 'Characters', type: 'folder', children: [] },
    { id: 6, name: 'Settings', type: 'folder', children: [] },
  ]},
  { id: 7, name: 'Short Stories', type: 'folder', children: [
    { id: 8, name: 'Story 1', type: 'file', children: [], content: '' },
    { id: 9, name: 'Story 2', type: 'file', children: [], content: '' },
  ]},
];

function App() {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      document.title = selectedProject.name;
      setEditorContent(selectedProject.content || '');
    } else {
      document.title = 'Scrivener-like App';
    }
  }, [selectedProject]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCreateNewProject = () => {
    setIsCreatingNewProject(true);
  };

  const handleSaveNewProject = () => {
    const newProject: Project = {
      id: Date.now(),
      name: newProjectName,
      type: 'folder',
      children: [],
    };
    setProjects([...projects, newProject]);
    setIsCreatingNewProject(false);
    setNewProjectName('');
  };

  const handleSaveContent = () => {
    if (selectedProject && selectedProject.type === 'file') {
      const updatedProjects = updateProjectContent(projects, selectedProject.id, editorContent);
      setProjects(updatedProjects);
    }
  };

  const updateProjectContent = (projects: Project[], id: number, content: string): Project[] => {
    return projects.map(project => {
      if (project.id === id) {
        return { ...project, content };
      } else if (project.children.length > 0) {
        return { ...project, children: updateProjectContent(project.children, id, content) };
      }
      return project;
    });
  };

  const renderProjects = (projects: Project[]) => {
    return projects.map((project) => (
      <div key={project.id}>
        <div
          className="flex items-center py-2 px-4 hover:bg-gray-200 cursor-pointer"
          onClick={() => handleSelectProject(project)}
        >
          {project.type === 'folder' ? (
            <Folder size={24} />
          ) : (
            <File size={24} />
          )}
          <span className="ml-2">{project.name}</span>
        </div>
        {project.children.length > 0 && (
          <div className="ml-4">
            {renderProjects(project.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-gray-800 text-gray-100 p-4 flex justify-between">
        <h1 className="text-lg font-bold">Scrivener-like App</h1>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleCreateNewProject}
        >
          <Plus size={24} />
          New Project
        </button>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-gray-100 p-4 flex flex-col">
          {renderProjects(projects)}
          {isCreatingNewProject && (
            <div className="flex items-center py-2 px-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full p-2 border border-gray-400 rounded"
                placeholder="New Project Name"
              />
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleSaveNewProject}
              >
                Save
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedProject && (
            <div>
              <h2 className="text-lg font-bold mb-4">{selectedProject.name}</h2>
              {selectedProject.type === 'file' && (
                <div>
                  <textarea
                    className="w-full h-[calc(100vh-200px)] p-2 border border-gray-300 rounded"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                  />
                  <button
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                    onClick={handleSaveContent}
                  >
                    <Save size={24} className="mr-2" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;