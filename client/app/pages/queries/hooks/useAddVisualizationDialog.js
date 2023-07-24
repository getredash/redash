import { useState, useCallback, useEffect } from "react";
import useQueryFlags from "./useQueryFlags";
import useEditVisualizationDialog from "./useEditVisualizationDialog";

export default function useAddVisualizationDialog(query, queryResult, saveQuery, onChange) {
  const queryFlags = useQueryFlags(query);
  const editVisualization = useEditVisualizationDialog(query, queryResult, onChange);
  const [shouldOpenDialog, setShouldOpenDialog] = useState(false);

  useEffect(() => {
    if (!queryFlags.isNew && shouldOpenDialog) {
      setShouldOpenDialog(false);
      editVisualization();
    }
  }, [queryFlags.isNew, shouldOpenDialog, editVisualization]);

  return useCallback(() => {
    if (queryFlags.isNew) {
      setShouldOpenDialog(true);
      saveQuery();
    } else {
      editVisualization();
    }
  }, [queryFlags.isNew, saveQuery, editVisualization]);
}
