import { useContext, useState, useEffect, useRef } from "react";
import "./index.css";
import { GameContext, type GameContextType } from "../Providers/GameProvider";
import { List } from "react-virtualized";
import { useClickOutside } from "./useClickOutside";
import { imgToBase64, loadImage } from "../../utils/utils";
const Setup = () => {
  const [username, setUsername] = useState("");
  const [spriteName, setSpriteName] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [nameList, setNameList] = useState<string[]>([]);
  const [nameListFiltered, setNameListFiltered] = useState<string[]>([]);
  const [alts, setAlts] = useState<string[]>([]);
  const [altElements, setAltElements] = useState([]);
  const selectRef = useRef(null);

  const gameContext = useContext(GameContext) as GameContextType;
  const { connect } = gameContext.actions;

  useEffect(() => {
    fetch(`/pmd-village/sprite/characters.json`)
      .then((res) => res.json())
      .then((res) => {
        setNameList(res.characters);
        setNameListFiltered(res.characters);
      });
  }, []);

  useEffect(() => {
    if (filterValue.length <= 0) {
      setNameListFiltered(nameList);
    } else {
      setNameListFiltered(nameList.filter((el) => el.includes(filterValue)));
    }
  }, [filterValue]);

  const handleConnect = () => {
    if (username.length > 1) {
      connect(username, spriteName);
      setLoading(true);
    }
  };

  const handleSelect = (char: string) => {
    const item = char.split("|");
    const num = item[0];
    const name = item[1];
    setAlts(nameList.filter((el) => el.startsWith(num)));
    setSpriteName(name);
    setSearchOpen(false);
    setFilterValue("");
  };

  useEffect(() => {
    const fetchAlts = async () => {
      let elements = [];
      for (let alt of alts) {
        const item = alt.split("|");
        const name = item[1];
        const img = await loadImage(`/pmd-village/sprite/${name}/portrait.png`);
        const buffer = await createImageBitmap(img, 0, 0, 40, 40);
        elements.push(
          <img
            key={alt}
            src={imgToBase64(buffer)}
            className={name === spriteName ? "portrait selected" : "portrait"}
            onClick={() => setSpriteName(name)}
          />,
        );
      }
      setAltElements(elements);
    };

    if (alts.length > 1) {
      fetchAlts().catch((e) => console.log(e));
    } else {
      setAltElements([]);
    }
  }, [alts, spriteName]);

  function rowRenderer({
    key, // Unique key within array of rows
    index, // Index of row within collection
    isScrolling, // The List is currently being scrolled
    isVisible, // This row is visible within the List (eg it is not an overscanned row)
    style, // Style object to be applied to row (to position it)
  }) {
    const item = nameListFiltered[index].split("|");
    return (
      <div
        key={key}
        style={style}
        onClick={() => handleSelect(nameListFiltered[index])}
        className="char-row"
      >
        {item[1]}
      </div>
    );
  }

  const handleBlur = () => {
    if (!searchOpen) return;
    setSearchOpen(false);
    setFilterValue("");
  };

  //clicked outside box handler
  useClickOutside(selectRef, handleBlur);

  return (
    <div id="setup-container">
      <div id="setup">
        <div>Enter Username</div>
        <div id="input-box">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={handleConnect}
            disabled={!(username && spriteName) || loading}
          >
            CONNECT!
          </button>
        </div>
        <div id="char-select">
          <div id="select-container">
            <div>Select Your Guy</div>
            <div ref={selectRef}>
              <input
                id="char-input-search"
                autoComplete="off"
                value={searchOpen ? filterValue : spriteName}
                onChange={(e) => setFilterValue(e.target.value)}
                onClick={() => {
                  setSearchOpen(true);
                }}
              />
              <div id="char-list" hidden={!searchOpen}>
                <List
                  width={200}
                  height={
                    nameListFiltered.length > 8
                      ? 200
                      : nameListFiltered.length * 35
                  }
                  rowCount={nameListFiltered.length}
                  rowHeight={35}
                  rowRenderer={rowRenderer}
                />
              </div>
            </div>
            {altElements.length > 1 && (
              <div id="alt-container">
                <div id="portraits">{altElements}</div>
                <div>Alternate Forms</div>
              </div>
            )}
          </div>
        </div>
        {loading && <div>Loading in. Hang tight!</div>}
      </div>
    </div>
  );
};

export default Setup;
