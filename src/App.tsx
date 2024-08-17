import React, { useState, useEffect } from 'react';
import { Folder, File, Plus, Save, Edit, Trash } from 'lucide-react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import './App.css';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';
import jsPDF from 'jspdf';

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
  type: 'project' | 'chapter';
  children: Project[];
  content?: string;
  metadata: ProjectMetadata;
}

const countWords = (content: string): number => {
  const plainText = content.replace(/<[^>]+>/g, '');
  return plainText.trim().split(/\s+/).length;
};

const saveProjectsToLocalStorage = (projects: Project[]) => {
  localStorage.setItem('projects', JSON.stringify(projects));
};

const loadProjectsFromLocalStorage = (): Project[] => {
  const savedProjects = localStorage.getItem('projects');
  if (savedProjects) {
    return JSON.parse(savedProjects);
  }
  return [];
};

const getInitialProjects = (): Project[] => {
  const savedProjects = loadProjectsFromLocalStorage();
  return savedProjects;
};

const useProjectsWithStorage = () => {
  const [projects, setProjectsState] = useState(getInitialProjects);

  const setProjects = (newProjects: Project[] | ((prev: Project[]) => Project[])) => {
    setProjectsState((prevProjects) => {
      const updatedProjects = typeof newProjects === 'function' ? newProjects(prevProjects) : newProjects;
      saveProjectsToLocalStorage(updatedProjects);
      return updatedProjects;
    });
  };

  return [projects, setProjects] as const;
};

function App() {
    const [projects, setProjects] = useProjectsWithStorage();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const onDragEnd = (result: any) => {
      if (!result.destination) return;
      const items = Array.from(projects);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setProjects(items);
    };

    const clearLocalStorage = () => {
      localStorage.removeItem('projects');
      setProjects([]);
    };

    const handleSaveAllProjects = () => {
      saveProjectsToLocalStorage(projects);
      alert('All projects saved successfully!');
    };

    const handleLoadProjects = () => {
      const loadedProjects = loadProjectsFromLocalStorage();
      setProjects(loadedProjects);
      alert('Projects loaded successfully!');
    };

    const handleExportProjects = () => {
      const projectsJson = JSON.stringify(projects);
      const blob = new Blob([projectsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scrivener_projects.json';
      link.click();
      URL.revokeObjectURL(url);
    };

    const handleImportProjects = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result;
          if (typeof content === 'string') {
            const importedProjects = JSON.parse(content);
            setProjects(importedProjects);
            alert('Projects imported successfully!');
          }
        };
        reader.readAsText(file);
      }
    };

    useEffect(() => {
      if (selectedProject) {
        document.title = selectedProject.name;
        if (selectedProject.type === 'chapter' && selectedProject.content) {
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
      const newProject: Project = {
        id: Date.now(),
        name: newProjectName,
        type: 'project',
        children: [],
        metadata: {
          status: 'Not Started',
          wordCountGoal: 0,
          actualWordCount: 0,
          lastModified: new Date().toISOString(),
          creationDate: new Date().toISOString(),
          completionPercentage: 0,
          tags: [],
          author: '',
          estimatedReadingTime: 0,
          version: '1.0'
        },
      };
      setProjects([...projects, newProject]);
      setIsCreatingNewProject(false);
      setNewProjectName('');
    };

    const handleCreateNewChapter = (projectId: number) => {
      const newChapter: Project = {
        id: Date.now(),
        name: 'New Chapter',
        type: 'chapter',
        children: [],
        content: '',
        metadata: {
          status: 'Not Started',
          wordCountGoal: 0,
          actualWordCount: 0,
          lastModified: new Date().toISOString(),
          creationDate: new Date().toISOString(),
          completionPercentage: 0,
          tags: [],
          author: '',
          estimatedReadingTime: 0,
          version: '1.0'
        },
      };
      const updatedProjects = addChapterToProject(projects, projectId, newChapter);
      setProjects(updatedProjects);
    };

    const addChapterToProject = (projects: Project[], projectId: number, newChapter: Project): Project[] => {
      return projects.map(project => {
        if (project.id === projectId) {
          return { ...project, children: [...project.children, newChapter] };
        }
        return project;
      });
    };

    const handleDeleteProject = (projectId: number) => {
      setProjects(projects.filter(project => project.id !== projectId));
    };

    const handleDeleteChapter = (projectId: number, chapterId: number) => {
      setProjects(projects.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            children: project.children.filter(chapter => chapter.id !== chapterId)
          };
        }
        return project;
      }));
    };

    const handleSaveNewProject = () => {
      const newProject: Project = {
        id: Date.now(),
        name: newProjectName,
        type: 'project',
        children: [],
        metadata: {
          status: 'Not Started',
          wordCountGoal: 0,
          actualWordCount: 0,
          lastModified: new Date().toISOString(),
          creationDate: new Date().toISOString(),
          completionPercentage: 0,
          tags: [],
          author: '',
          estimatedReadingTime: 0,
          version: '1.0'
        },
      };
      setProjects([...projects, newProject]);
      setIsCreatingNewProject(false);
      setNewProjectName('');
    };

    const handleSaveContent = () => {
      if (selectedProject && selectedProject.type === 'chapter') {
        const contentState = editorState.getCurrentContent();
        const rawContentState = convertToRaw(contentState);
        const content = JSON.stringify(rawContentState);
        const newWordCount = countWords(contentState.getPlainText());
        const updatedMetadata = {
          ...selectedProject.metadata,
          actualWordCount: newWordCount,
          lastModified: new Date().toISOString(),
          completionPercentage: Math.min((newWordCount / selectedProject.metadata.wordCountGoal) * 100, 100),
          estimatedReadingTime: Math.ceil(newWordCount / 250)
        };
        const updatedProjects = updateProjectContent(projects, selectedProject.id, content, updatedMetadata);
        setProjects(updatedProjects);
        setSelectedProject({...selectedProject, content, metadata: updatedMetadata});
        saveProjectsToLocalStorage(updatedProjects);
        alert('Chapter saved successfully!');
      }
    };



    const updateProjectContent = (projects: Project[], id: number, content: string, metadata: ProjectMetadata): Project[] => {
      return projects.map(project => {
        if (project.id === id) {
          return { ...project, content, metadata: {...project.metadata, ...metadata} };
        } else if (project.children.length > 0) {
          return { ...project, children: updateProjectContent(project.children, id, content, metadata) };
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
          return { ...project, metadata: {...project.metadata, ...metadata} };
        } else if (project.children.length > 0) {
          return { ...project, children: updateProjectMetadata(project.children, id, metadata) };
        }
        return project;
      });
    };

    const handleRename = (id: number, newName: string) => {
      const updatedProjects = updateProjectName(projects, id, newName);
      setProjects(updatedProjects);
    };

    const updateProjectName = (projects: Project[], id: number, newName: string): Project[] => {
      return projects.map(project => {
        if (project.id === id) {
          return { ...project, name: newName };
        } else if (project.children.length > 0) {
          return { ...project, children: updateProjectName(project.children, id, newName) };
        }
        return project;
      });
    };

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          handleSaveContent();
        }
        // shortcuts here
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleSaveContent]);

    const exportToPDF = () => {
      if (selectedProject && selectedProject.type === 'chapter') {
        const doc = new jsPDF();
        doc.text(selectedProject.name, 10, 10);
        doc.text(editorState.getCurrentContent().getPlainText(), 10, 20);
        doc.save(`${selectedProject.name}.pdf`);
      }
    };

    const renderProjects = (projects: Project[], level = 0) => {
      return (
        <Droppable droppableId={`projectList-${level}`} type={`level-${level}`}>
          {(provided: DroppableProvided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {projects.map((project, index) => (
                <Draggable key={project.id} draggableId={project.id.toString()} index={index}>
                  {(provided: DraggableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="flex items-center py-2 px-4 hover:bg-gray-200 cursor-pointer">
                        {editingId === project.id ? (
                          <input
                            type="text"
                            value={project.name}
                            onChange={(e) => handleRename(project.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <div onClick={() => handleSelectProject(project)}>
                            {project.type === 'project' ? <Folder size={24} /> : <File size={24} />}
                            <span className="ml-2">{project.name}</span>
                            <span className="ml-2 text-sm text-gray-500">({project.metadata.status})</span>
                          </div>
                        )}
                        <button
                          className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
                          onClick={() => setEditingId(project.id)}
                        >
                          Rename
                        </button>
                        <button
                          className="ml-auto bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                          onClick={() => project.type === 'project' ? handleDeleteProject(project.id) : handleDeleteChapter(project.id, project.id)}
                        >
                          Delete
                        </button>
                      </div>
                      {project.type === 'project' && (
                        <div className="ml-4">
                          {renderProjects(project.children, level + 1)}
                          <button
                            className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
                            onClick={() => handleCreateNewChapter(project.id)}
                          >
                            New Chapter
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      );
    };

    const renderMetadataEditor = () => {
      if (!selectedProject) return null;

      return (

        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold mb-2">Metadata</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Status:</label>
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
              <label className="block mb-1">Word Count Goal:</label>
              <input
                type="number"
                value={selectedProject.metadata.wordCountGoal}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, wordCountGoal: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Actual Word Count:</label>
              <input type="number" value={selectedProject.metadata.actualWordCount} readOnly className="w-full p-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1">Completion Percentage:</label>
              <input type="number" value={selectedProject.metadata.completionPercentage.toFixed(2)} readOnly className="w-full p-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1">Last Modified:</label>
              <input type="text" value={new Date(selectedProject.metadata.lastModified).toLocaleString()} readOnly className="w-full p-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1">Creation Date:</label>
              <input type="text" value={new Date(selectedProject.metadata.creationDate).toLocaleString()} readOnly className="w-full p-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1">Tags:</label>
              <input
                type="text"
                value={selectedProject.metadata.tags.join(', ')}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, tags: e.target.value.split(',').map(tag => tag.trim()) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Author:</label>
              <input
                type="text"
                value={selectedProject.metadata.author}
                onChange={(e) => handleUpdateMetadata({ ...selectedProject.metadata, author: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Estimated Reading Time (minutes):</label>
              <input type="number" value={selectedProject.metadata.estimatedReadingTime} readOnly className="w-full p-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1">Version:</label>
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
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="h-screen flex flex-col">
      <nav className="bg-gray-800 text-gray-100 p-4 flex justify-between items-center">
  <h1 className="text-lg font-bold">Scrivener-like App</h1>
  <div className="flex space-x-2">
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={handleSaveAllProjects}
    >
      <Save size={20} className="mr-2" />
      Save All
    </button>
    <button
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={handleLoadProjects}
    >
      <File size={20} className="mr-2" />
      Load Projects
    </button>
    <button
      className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={handleCreateNewProject}
    >
      <Plus size={20} className="mr-2" />
      New Project
    </button>
    <button
      className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={handleExportProjects}
    >
      <Save size={20} className="mr-2" />
      Export
    </button>
    <input
      type="file"
      id="import-projects"
      className="hidden"
      onChange={handleImportProjects}
      accept=".json"
    />
    <label
      htmlFor="import-projects"
      className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded flex items-center cursor-pointer"
    >
      <File size={20} className="mr-2" />
      Import
    </label>
    <button
  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
  onClick={clearLocalStorage}
>
  <Trash size={20} className="mr-2" />
  Clear All
</button>
  </div>
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
  <div className="flex space-x-2">
    <button
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={handleSaveContent}
    >
      <Save size={24} className="mr-2" />
      Save Project
    </button>
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
    >
      <Edit size={24} className="mr-2" />
      {isEditingMetadata ? 'Hide Metadata' : 'Edit Metadata'}
    </button>
  </div>
</div>
                {isEditingMetadata && renderMetadataEditor()}
                {selectedProject.type === 'chapter' && (
                  <div>
                    <Editor
  editorState={editorState}
  onEditorStateChange={setEditorState}
  wrapperClassName="border border-gray-300 rounded"
  editorClassName="p-2 min-h-[calc(100vh-300px)]"
  toolbar={{
    options: ['inline', 'blockType', 'fontSize', 'fontFamily', 'list', 'textAlign', 'colorPicker', 'link', 'embedded', 'emoji', 'image', 'remove', 'history'],
    inline: { inDropdown: false, options: ['bold', 'italic', 'underline', 'strikethrough', 'monospace', 'superscript', 'subscript'] },
    blockType: { inDropdown: true, options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote', 'Code'] },
    fontSize: { options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48] },
    fontFamily: { options: ['Arial', 'Georgia', 'Impact', 'Tahoma', 'Times New Roman', 'Verdana'] },
  }}
/>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </DragDropContext>

    );
  }


export default App;