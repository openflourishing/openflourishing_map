import { useRegisterEvents } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect } from "react";

function getMouseLayer() {
  return document.querySelector(".sigma-mouse");
}

const GraphEventsController: FC<PropsWithChildren<{ 
  setHoveredNode: (node: string | null) => void;
  setSelectedNode: (node: string | null) => void;
  isRotationDragging: boolean;
}>> = ({
  setHoveredNode,
  setSelectedNode,
  isRotationDragging,
  children,
}) => {
  const registerEvents = useRegisterEvents();

  /**
   * Initialize here settings that require to know the graph and/or the sigma
   * instance:
   */
  useEffect(() => {
    registerEvents({
      clickNode({ node }) {
        setSelectedNode(node);
      },
      enterNode({ node }) {
        if (isRotationDragging) return; // Don't trigger hover during 3D rotation
        setHoveredNode(node);
        // TODO: Find a better way to get the DOM mouse layer:
        const mouseLayer = getMouseLayer();
        if (mouseLayer) mouseLayer.classList.add("mouse-pointer");
      },
      leaveNode() {
        if (isRotationDragging) return; // Don't trigger hover during 3D rotation
        setHoveredNode(null);
        // TODO: Find a better way to get the DOM mouse layer:
        const mouseLayer = getMouseLayer();
        if (mouseLayer) mouseLayer.classList.remove("mouse-pointer");
      },
    });
  }, [isRotationDragging]);

  return <>{children}</>;
};

export default GraphEventsController;
