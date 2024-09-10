import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import Header from './components/Header';
import ProjectList from './components/ProjectList';
import Editor from './components/Editor';
import Metadata from './components/Metadata';
import { Project, ProjectMetadata } from './types';
import {
  useProjectsWithStorage,
  onDragEnd,
  createNewProject,
  createNewChapter,
  addChapterToProject,
  deleteProject,
  deleteChapter,
  updateProjectContent,
  updateProjectMetadata,
  updateProjectName,
  countWords,
  exportProjects,
  importProjects,
  clearLocalStorage,
  saveAllProjects,
  loadProjects,
  selectProject,
  renameProject
} from './utils';

function App() {
  const [projects, setProjects] = useProjectsWithStorage();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const handleCreateNewProject = () => {
    const newProject = createNewProject(newProjectName);
    setProjects([...projects, newProject]);
    setIsCreatingNewProject(false);
    setNewProjectName('');
  };

  const handleCreateNewChapter = (projectId: number) => {
    const newChapter = createNewChapter();
    const updatedProjects = addChapterToProject(projects, projectId, newChapter);
    setProjects(updatedProjects);
  };

  const handleDeleteProject = (projectId: number) => {
    setProjects(deleteProject(projects, projectId));
  };

  const handleDeleteChapter = (projectId: number, chapterId: number) => {
    setProjects(deleteChapter(projects, projectId, chapterId));
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
      alert('Chapter saved successfully!');
    }
  };

  const handleUpdateMetadata = (newMetadata: ProjectMetadata) => {
    if (selectedProject) {
      const updatedProjects = updateProjectMetadata(projects, selectedProject.id, newMetadata);
      setProjects(updatedProjects);
      setSelectedProject({ ...selectedProject, metadata: newMetadata });
      setIsEditingMetadata(false);
    }
  };

  const handleRename = (id: number, newName: string) => {
    renameProject(projects, id, newName, setProjects);
  };

  const handleExportProjects = () => {
    exportProjects(projects);
  };

  const handleImportProjects = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importProjects(file, (importedProjects) => {
        setProjects(importedProjects);
        alert('Projects imported successfully!');
      });
    }
  };

  const changeTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--primary-color', '#6b46c1');
      document.documentElement.style.setProperty('--background-color', '#2d3748');
      document.documentElement.style.setProperty('--text-color', '#ffffff');
    } else {
      document.documentElement.style.setProperty('--primary-color', '#3490dc');
      document.documentElement.style.setProperty('--background-color', '#ffffff');
      document.documentElement.style.setProperty('--text-color', '#333333');
    }
  };

  return (
    <DragDropContext onDragEnd={(result) => onDragEnd(result, projects, setProjects)}>
      <div className="h-screen flex flex-col">
        <Header
          onSaveAll={() => saveAllProjects(projects)}
          onLoadProjects={() => loadProjects(setProjects)}
          onCreateNew={() => setIsCreatingNewProject(true)}
          onExport={handleExportProjects}
          onImport={handleImportProjects}
          onClearAll={clearLocalStorage}
          onChangeTheme={changeTheme}
        />
        <div className="flex flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            onSelectProject={(project) => selectProject(project, setSelectedProject, setIsEditingMetadata)}
            onCreateNewChapter={handleCreateNewChapter}
            onDeleteProject={handleDeleteProject}
            onDeleteChapter={handleDeleteChapter}
            onRename={handleRename}
            isCreatingNewProject={isCreatingNewProject}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            onSaveNewProject={handleCreateNewProject}
          />
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedProject && (
              <Editor
                project={selectedProject}
                editorState={editorState}
                setEditorState={setEditorState}
                onSave={handleSaveContent}
                onToggleMetadata={() => setIsEditingMetadata(!isEditingMetadata)}
                isEditingMetadata={isEditingMetadata}
              />
            )}
            {isEditingMetadata && selectedProject && (
              <Metadata
                metadata={selectedProject.metadata}
                onUpdate={handleUpdateMetadata}
              />
            )}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

export default App;