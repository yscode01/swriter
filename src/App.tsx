import React, { useState, useEffect } from 'react';
import { Folder, File, Plus, Save, Edit } from 'lucide-react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

interface ProjectMetadata {
  status: 'Not Started' | 'In Progress' | 'Completed';
  wordCountGoal: number;
}

interface Project {
  id: number;
  name: string;
  type: 'folder' | 'file';
  children: Project[];
  content?: string;
  metadata: ProjectMetadata;
}


const initialProjects: Project[] = [
  { id: 1, name: 'My Novel', type: 'folder', children: [
    { id: 2, name: 'Manuscript', type: 'folder', children: [
      { id: 3, name: 'Chapter 1', type: 'file', children: [], content: '', metadata: { status: 'Not Started', wordCountGoal: 2000 } },
      { id: 4, name: 'Chapter 2', type: 'file', children: [], content: '', metadata: { status: 'Not Started', wordCountGoal: 2000 } },
    ], metadata: { status: 'In Progress', wordCountGoal: 50000 } },
    { id: 5, name: 'Characters', type: 'folder', children: [], metadata: { status: 'Not Started', wordCountGoal: 0 } },
    { id: 6, name: 'Settings', type: 'folder', children: [], metadata: { status: 'Not Started', wordCountGoal: 0 } },
  ], metadata: { status: 'In Progress', wordCountGoal: 80000 } },
  { id: 7, name: 'Short Stories', type: 'folder', children: [
    { id: 8, name: 'Story 1', type: 'file', children: [], content: '', metadata: { status: 'Not Started', wordCountGoal: 5000 } },
    { id: 9, name: 'Story 2', type: 'file', children: [], content: '', metadata: { status: 'Not Started', wordCountGoal: 5000 } },
  ], metadata: { status: 'Not Started', wordCountGoal: 10000 } },
];

function App() {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      document.title = selectedProject.name;
      if (selectedProject.type === 'file' && selectedProject.content) {
        try {
          const contentState = convertFromRaw(JSON.parse(selectedProject.content));
          setEditorState(EditorState.createWithContent(contentState));
        } catch (error) {
          console.error('Error parsing content:', error);
          setEditorState(EditorState.createEmpty());
        }
      } else {
        setEditorState(EditorState.createEmpty());
      }
    } else {
      document.title = 'Scrivener-like App';
    }
  }, [selectedProject]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditingMetadata(false);
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
      metadata: { status: 'Not Started', wordCountGoal: 0 },
    };
    setProjects([...projects, newProject]);
    setIsCreatingNewProject(false);
    setNewProjectName('');
  };

  const handleSaveContent = () => {
    if (selectedProject && selectedProject.type === 'file') {
      const contentState = editorState.getCurrentContent();
      const rawContentState = convertToRaw(contentState);
      const updatedProjects = updateProjectContent(projects, selectedProject.id, JSON.stringify(rawContentState));
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

  const handleUpdateMetadata = (newMetadata: ProjectMetadata) => {
    if (selectedProject) {
      const updatedProjects = updateProjectMetadata(projects, selectedProject.id, newMetadata);
      setProjects(updatedProjects);
      setSelectedProject({ ...selectedProject, metadata: newMetadata });
      setIsEditingMetadata(false);
    }
  };

  const updateProjectMetadata = (projects: Project[], id: number, metadata: ProjectMetadata): Project[] => {
    return projects.map(project => {
      if (project.id === id) {
        return { ...project, metadata };
      } else if (project.children.length > 0) {
        return { ...project, children: updateProjectMetadata(project.children, id, metadata) };
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
          <span className="ml-2 text-sm text-gray-500">({project.metadata.status})</span>
        </div>
        {project.children.length > 0 && (
          <div className="ml-4">
            {renderProjects(project.children)}
          </div>
        )}
      </div>
    ));
  };

  const renderMetadataEditor = () => {
    if (!selectedProject) return null;

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">Metadata</h3>
        <div className="flex items-center mb-2">
          <label className="w-32">Status:</label>
          <select
            value={selectedProject.metadata.status}
            onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, status: e.target.value as ProjectMetadata['status'] })}
            className="p-2 border rounded"
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="flex items-center">
          <label className="w-32">Word Count Goal:</label>
          <input
            type="number"
            value={selectedProject.metadata.wordCountGoal}
            onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, wordCountGoal: parseInt(e.target.value) })}
            className="p-2 border rounded"
          />
        </div>
      </div>
    );
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">{selectedProject.name}</h2>
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                >
                  <Edit size={24} className="mr-2" />
                  {isEditingMetadata ? 'Hide Metadata' : 'Edit Metadata'}
                </button>
              </div>
              {isEditingMetadata && renderMetadataEditor()}
              {selectedProject.type === 'file' && (
                <div>
                  <Editor
                    editorState={editorState}
                    onEditorStateChange={setEditorState}
                    wrapperClassName="border border-gray-300 rounded"
                    editorClassName="p-2 min-h-[calc(100vh-300px)]"
                    toolbar={{
                      options: ['inline', 'blockType', 'fontSize', 'fontFamily', 'list', 'textAlign', 'colorPicker', 'link', 'embedded', 'emoji', 'image', 'remove', 'history'],
                    }}
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