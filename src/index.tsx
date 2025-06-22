import ReactDOM from "react-dom/client";

import "./styles.css";
import Root from "./views/Root";

const container = document.getElementById('root') as HTMLElement;
if (container && !container.hasAttribute('data-react-mounted')) {
  container.setAttribute('data-react-mounted', 'true');
  const root = ReactDOM.createRoot(container);
  root.render(
    <Root />
  );
}
