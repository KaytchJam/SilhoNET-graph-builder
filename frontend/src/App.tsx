import './App.css'
import KeyPressListener from './components/KeyPressListener'
import TodoList from './components/TodoList'
import ShoppingList from './components/ShoppingList'
import GithubUserSearch from './components/GithubUserSearch'
import YoutubeComponent from './components/YoutubeComponent'
import WebGLComponent from './components/WebGLComponent'
import WebGLComponentTwo from './components/WebGLComponentTwo'

function App() {
  return (
    <>
      <div className="app-body">
        <h1 className="app-h1">Hello React</h1>
        <div className="divider"></div>

        <div className="round-ctner">
          <h2 className="app-h2">Arrow Matching Component</h2>
          <KeyPressListener/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">Todo List Component</h2>
          <TodoList/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">Shopping List Component</h2>
          <ShoppingList/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">Github User Search Component</h2>
          <GithubUserSearch/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">React youtube</h2>
          <YoutubeComponent/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">WebGL Component</h2>
          <WebGLComponent/>
        </div>

        <div className="round-ctner">
          <h2 className="app-h2">WebGL Component 2</h2>
          <WebGLComponentTwo/>
        </div>
      </div>

    </>
  )
}

export default App
