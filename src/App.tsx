import React, { useState, useEffect } from 'react';
import { Folder, File, Plus, Save, Edit } from 'lucide-react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

interface ProjectMetadata {
  status: 'Not Started' | 'In Progress' | 'Completed';
  wordCountGoal: number;
  actualWordCount: number;
  lastModified: string;
  creationDate: string;
  completionPercentage: number;
  tags: string[];
  author: string;
  estimatedReadingTime: number;
  version: string;
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
  {
    id: 1,
    name: 'My Novel',
    type: 'folder',
    children: [
      {
        id: 2,
        name: 'Manuscript',
        type: 'folder',
        children: [
          {
            id: 3,
            name: 'Chapter 1',
            type: 'file',
            children: [],
            content: '',
            metadata: {
              status: 'Not Started',
              wordCountGoal: 2000,
              actualWordCount: 0,
              lastModified: new Date().toISOString(),
              creationDate: new Date().toISOString(),
              completionPercentage: 0,
              tags: ['chapter'],
              author: 'John Doe',
              estimatedReadingTime: 0,
              version: '1.0'
            }
          },
        ],
        metadata: {
          status: 'In Progress',
          wordCountGoal: 50000,
          actualWordCount: 0,
          lastModified: new Date().toISOString(),
          creationDate: new Date().toISOString(),
          completionPercentage: 0,
          tags: ['manuscript'],
          author: 'John Doe',
          estimatedReadingTime: 0,
          version: '1.0'
        }
      },
    ],
    metadata: {
      status: 'In Progress',
      wordCountGoal: 80000,
      actualWordCount: 0,
      lastModified: new Date().toISOString(),
      creationDate: new Date().toISOString(),
      completionPercentage: 0,
      tags: ['novel'],
      author: 'John Doe',
      estimatedReadingTime: 0,
      version: '1.0'
    }
  },
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

    const countWords = (content: string): number => {
      const plainText = content.replace(/<[^>]+>/g, '');
      return plainText.trim().split(/\s+/).length;
    };

    const calculateEstimatedReadingTime = (wordCount: number): number => {
      const averageReadingSpeed = 250;
      return Math.ceil(wordCount / averageReadingSpeed);
    };

    const handleSaveContent = () => {
      if (selectedProject && selectedProject.type === 'file') {
        const contentState = editorState.getCurrentContent();
        const rawContentState = convertToRaw(contentState);
        const content = JSON.stringify(rawContentState);
        const newWordCount = countWords(contentState.getPlainText());
        const estimatedReadingTime = calculateEstimatedReadingTime(newWordCount);
        const completionPercentage = Math.min((newWordCount / selectedProject.metadata.wordCountGoal) * 100, 100);

        const updatedMetadata: ProjectMetadata = {
          ...selectedProject.metadata,
          actualWordCount: newWordCount,
          lastModified: new Date().toISOString(),
          completionPercentage,
          estimatedReadingTime,
        };

        const updatedProjects = updateProjectContentAndMetadata(projects, selectedProject.id, content, updatedMetadata);
        setProjects(updatedProjects);
        setSelectedProject({...selectedProject, content, metadata: updatedMetadata});
      }
    };

    const updateProjectContentAndMetadata = (projects: Project[], id: number, content: string, metadata: ProjectMetadata): Project[] => {
      return projects.map(project => {
        if (project.id === id) {
          return { ...project, content, metadata };
        } else if (project.children.length > 0) {
          return { ...project, children: updateProjectContentAndMetadata(project.children, id, content, metadata) };
        }
        return project;
      });
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
        metadata: {
          status: 'Not Started',
          wordCountGoal: 0,
          actualWordCount: 0,
          lastModified: new Date().toISOString(),
          creationDate: new Date().toISOString(),
          completionPercentage: 0,
          tags: [],
          author: 'Default Author',
          estimatedReadingTime: 0,
          version: '1.0'
        },
      };
      setProjects([...projects, newProject]);
      setIsCreatingNewProject(false);
      setNewProjectName('');
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block">Status:</label>
              <select
                value={selectedProject.metadata.status}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, status: e.target.value as ProjectMetadata['status'] })}
                className="w-full p-2 border rounded"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block">Word Count Goal:</label>
              <input
                type="number"
                value={selectedProject.metadata.wordCountGoal}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, wordCountGoal: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">Actual Word Count:</label>
              <input
                type="number"
                value={selectedProject.metadata.actualWordCount}
                readOnly
                className="w-full p-2 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label className="block">Last Modified:</label>
              <input
                type="text"
                value={new Date(selectedProject.metadata.lastModified).toLocaleString()}
                readOnly
                className="w-full p-2 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label className="block">Creation Date:</label>
              <input
                type="text"
                value={new Date(selectedProject.metadata.creationDate).toLocaleString()}
                readOnly
                className="w-full p-2 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label className="block">Completion Percentage:</label>
              <input
                type="text"
                value={`${selectedProject.metadata.completionPercentage.toFixed(2)}%`}
                readOnly
                className="w-full p-2 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label className="block">Tags:</label>
              <input
                type="text"
                value={selectedProject.metadata.tags.join(', ')}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, tags: e.target.value.split(',').map(tag => tag.trim()) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">Author:</label>
              <input
                type="text"
                value={selectedProject.metadata.author}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, author: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">Estimated Reading Time (minutes):</label>
              <input
                type="number"
                value={selectedProject.metadata.estimatedReadingTime}
                readOnly
                className="w-full p-2 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label className="block">Version:</label>
              <input
                type="text"
                value={selectedProject.metadata.version}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, version: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
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