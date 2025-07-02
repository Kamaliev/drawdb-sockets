import { useState, useEffect, useCallback, createContext } from "react";
import ControlPanel from "./EditorHeader/ControlPanel";
import Canvas from "./EditorCanvas/Canvas";
import { CanvasContextProvider } from "../context/CanvasContext";
import SidePanel from "./EditorSidePanel/SidePanel";
import { DB, State } from "../data/constants";
import { db } from "../data/db";
import {
  useLayout,
  useSettings,
  useTransform,
  useDiagram,
  useUndoRedo,
  useAreas,
  useNotes,
  useTypes,
  useTasks,
  useSaveState,
  useEnums,
} from "../hooks";
import FloatingControls from "./FloatingControls";
import { Modal, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../data/databases";
import { isRtl } from "../i18n/utils/rtl";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../api/gists";
import {
  getLastModifiedDiagramApiV1DiagramLastGet,
  useCreateDiagramApiV1DiagramPost, useGetDiagramByIdApiV1DiagramDiagramIdGet,
  useGetLastModifiedDiagramApiV1DiagramLastGet, useUpdateDiagramApiV1DiagramDiagramIdPut,
} from "../api/generated/endpoints.js";
import { useDiagramWebSocket } from "../api/socket.js";

export const IdContext = createContext({ gistId: "", setGistId: () => {} });

const SIDEPANEL_MIN_WIDTH = 384;

export default function WorkSpace({ uuid }) {
  const [id, setId] = useState(0);
  const [UUID, setUUID] = useState(uuid);
  const [gistId, setGistId] = useState("");
  const [loadedFromGistId, setLoadedFromGistId] = useState("");
  const [title, setTitle] = useState("Untitled Diagram");
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState(SIDEPANEL_MIN_WIDTH);
  const [lastSaved, setLastSaved] = useState("");
  const [showSelectDbModal, setShowSelectDbModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState("");
  const { layout } = useLayout();
  const { settings } = useSettings();
  const { types, setTypes } = useTypes();
  const { areas, setAreas } = useAreas();
  const { tasks, setTasks } = useTasks();
  const { notes, setNotes } = useNotes();
  const { saveState, setSaveState } = useSaveState();
  const { transform, setTransform } = useTransform();
  const { enums, setEnums } = useEnums();
  const navigate = useNavigate();



  const {mutate: createDiagramMutate} = useCreateDiagramApiV1DiagramPost({
    mutation: {
      onSuccess: data => {
        setUUID(data.data.id)
        navigate(`/editor/${data.data.id}`, { replace: true });
      }
    }
  })

  const {mutate: updateDiagramMutate} = useUpdateDiagramApiV1DiagramDiagramIdPut(
    {mutation: {
      onSuccess: data => {
        setSaveState(State.SAVED);
        setLastSaved(new Date().toLocaleString());
        console.log(data)
      }
      }}
  )


  const {data: getLastDiagramData, getDiagramIsPending} = useGetLastModifiedDiagramApiV1DiagramLastGet({
        query: {
          enabled: UUID === "",
        }
          })


  const {data: getDiagramaDataById, getDiagramByIdIsPending} = useGetDiagramByIdApiV1DiagramDiagramIdGet(UUID,
    {
      query: {
        enabled: UUID !== "",
      }
    })

  const {
    tables,
    relationships,
    setTables,
    setRelationships,
    database,
    setDatabase,
  } = useDiagram();
  const { undoStack, redoStack, setUndoStack, setRedoStack } = useUndoRedo();
  const { t, i18n } = useTranslation();
  let [searchParams, setSearchParams] = useSearchParams();
  const handleResize = (e) => {
    if (!resize) return;
    const w = isRtl(i18n.language) ? window.innerWidth - e.clientX : e.clientX;
    if (w > SIDEPANEL_MIN_WIDTH) setWidth(w);
  };

  useEffect(() => {
    if (!UUID && !getDiagramIsPending) {
      console.log(getLastDiagramData)
      const d = getLastDiagramData?.data.data;
      if (d) {
        if (d.database) {
          setDatabase(d.database);
        } else {
          setDatabase(DB.GENERIC);
        }
        setId(d.id);
        setUUID(getLastDiagramData.data.id);
        setGistId(d.gistId);
        setLoadedFromGistId(d.loadedFromGistId);
        setTitle(d.name );
        setTables(d.tables ?? []);
        setRelationships(d.references ?? []);
        setNotes(d.notes ?? []);
        setAreas(d.areas ?? []);
        setTasks(d.todos ?? []);
        setTransform({ pan: d.pan, zoom: d.zoom });
        if (databases[database].hasTypes) {
          setTypes(d.types ?? []);
        }
        if (databases[database].hasEnums) {
          setEnums(d.enums ?? []);
        }
        navigate(`/editor/${getLastDiagramData.data.id}`, { replace: true });


      }
    }
  }, [UUID, getDiagramIsPending, getLastDiagramData, setTables, setRelationships, setNotes, setAreas, setTasks, setTransform, database, navigate, setDatabase, setTypes, setEnums])


  useEffect(() => {
    if (UUID && !getDiagramByIdIsPending) {
      const d = getDiagramaDataById?.data.data;
      if (d) {
        if (d.database) {
          setDatabase(d.database);
        } else {
          setDatabase(DB.GENERIC);
        }
        setId(d.id);
        setGistId(d.gistId);
        setLoadedFromGistId(d.loadedFromGistId);
        setTitle(d.name );
        setTables(d.tables ?? []);
        setRelationships(d.references ?? []);
        setNotes(d.notes ?? []);
        setAreas(d.areas ?? []);
        setTasks(d.todos ?? []);
        setTransform({ pan: d.pan, zoom: d.zoom });
        if (databases[database].hasTypes) {
          setTypes(d.types ?? []);
        }
        if (databases[database].hasEnums) {
          setEnums(d.enums ?? []);
        }
      }
    }
  }, [UUID, getDiagramByIdIsPending, getDiagramaDataById, setTables, setRelationships, setNotes, setAreas, setTasks, setTransform, database, setDatabase, setTypes, setEnums])


  function websocketUpdate(data) {
    console.log(data)
  }
  useDiagramWebSocket(UUID)


  const save = useCallback(async () => {
    if (saveState !== State.SAVING) return;

    const name = window.name.split(" ");
    const op = name[0];
    const saveAsDiagram = window.name === "" || op === "d" || op === "lt";

    if (saveAsDiagram) {
      searchParams.delete("shareId");
      setSearchParams(searchParams);
      if ((id === 0 && window.name === "") || op === "lt") {
        await db.diagrams
          .add({
            database: database,
            name: title,
            gistId: gistId ?? "",
            lastModified: new Date(),
            tables: tables,
            references: relationships,
            notes: notes,
            areas: areas,
            todos: tasks,
            pan: transform.pan,
            zoom: transform.zoom,
            loadedFromGistId: loadedFromGistId,
            ...(databases[database].hasEnums && { enums: enums }),
            ...(databases[database].hasTypes && { types: types }),
          })
          .then((id) => {
            setId(id);
            window.name = `d ${id}`;
            setSaveState(State.SAVED);
            setLastSaved(new Date().toLocaleString());
          });
      } else {
        updateDiagramMutate({
          diagramId: UUID,
          data: {
            database: database,
            name: title,
            lastModified: new Date(),
            tables: tables,
            references: relationships,
            notes: notes,
            areas: areas,
            todos: tasks,
            gistId: gistId ?? "",
            pan: transform.pan,
            zoom: transform.zoom,
            loadedFromGistId: loadedFromGistId,
            ...(databases[database].hasEnums && { enums: enums }),
            ...(databases[database].hasTypes && { types: types }),
          }
        });
      }
    } else {
      await db.templates
        .update(id, {
          database: database,
          title: title,
          tables: tables,
          relationships: relationships,
          notes: notes,
          subjectAreas: areas,
          todos: tasks,
          pan: transform.pan,
          zoom: transform.zoom,
          ...(databases[database].hasEnums && { enums: enums }),
          ...(databases[database].hasTypes && { types: types }),
        })
        .then(() => {
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
        })
        .catch(() => {
          setSaveState(State.ERROR);
        });
    }
  }, [saveState, searchParams, setSearchParams, id, database, title, gistId, tables, relationships, notes, areas, tasks, transform.pan, transform.zoom, loadedFromGistId, enums, types, setSaveState, updateDiagramMutate, UUID]);


  useEffect(() => {
    if (
      tables?.length === 0 &&
      areas?.length === 0 &&
      notes?.length === 0 &&
      types?.length === 0 &&
      tasks?.length === 0
    )
      return;

    if (settings.autosave) {
      setSaveState(State.SAVING);
    }
  }, [
    undoStack,
    redoStack,
    settings.autosave,
    tables?.length,
    areas?.length,
    notes?.length,
    types?.length,
    relationships?.length,
    tasks?.length,
    title,
    gistId,
    setSaveState,
  ]);

  useEffect(() => {
    save();
  }, [saveState, save]);


  const handleSetDb = () => {
    if (selectedDb === "") return;
    setDatabase(selectedDb);
    setShowSelectDbModal(false);

    createDiagramMutate({
      data: {
        name: title
      }
    })

  }

  return (
    <div className="h-full flex flex-col overflow-hidden theme">
      <IdContext.Provider value={{ gistId, setGistId }}>
        <ControlPanel
          diagramId={id}
          setDiagramId={setId}
          title={title}
          setTitle={setTitle}
          lastSaved={lastSaved}
          setLastSaved={setLastSaved}
        />
      </IdContext.Provider>
      <div
        className="flex h-full overflow-y-auto"
        onPointerUp={(e) => e.isPrimary && setResize(false)}
        onPointerLeave={(e) => e.isPrimary && setResize(false)}
        onPointerMove={(e) => e.isPrimary && handleResize(e)}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
        style={isRtl(i18n.language) ? { direction: "rtl" } : {}}
      >
        {layout.sidebar && (
          <SidePanel resize={resize} setResize={setResize} width={width} />
        )}
        <div className="relative w-full h-full overflow-hidden">
          <CanvasContextProvider className="h-full w-full">
            <Canvas saveState={saveState} setSaveState={setSaveState} />
          </CanvasContextProvider>
          {!(layout.sidebar || layout.toolbar || layout.header) && (
            <div className="fixed right-5 bottom-4">
              <FloatingControls />
            </div>
          )}
        </div>
      </div>
      <Modal
        centered
        size="medium"
        closable={false}
        hasCancel={false}
        title={t("pick_db")}
        okText={t("confirm")}
        visible={showSelectDbModal}
        onOk={handleSetDb}
        okButtonProps={{ disabled: selectedDb === "" }}
      >
        <div className="grid grid-cols-3 gap-4 place-content-center">
          {Object.values(databases).map((x) => (
            <div
              key={x.name}
              onClick={() => setSelectedDb(x.label)}
              className={`space-y-3 p-3 rounded-md border-2 select-none ${
                settings.mode === "dark"
                  ? "bg-zinc-700 hover:bg-zinc-600"
                  : "bg-zinc-100 hover:bg-zinc-200"
              } ${selectedDb === x.label ? "border-zinc-400" : "border-transparent"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{x.name}</div>
                {x.beta && (
                  <Tag size="small" color="light-blue">
                    Beta
                  </Tag>
                )}
              </div>
              {x.image && (
                <img
                  src={x.image}
                  className="h-8"
                  style={{
                    filter:
                      "opacity(0.4) drop-shadow(0 0 0 white) drop-shadow(0 0 0 white)",
                  }}
                />
              )}
              <div className="text-xs">{x.description}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
