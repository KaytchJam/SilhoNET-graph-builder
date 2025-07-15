// src/components/KeyPressListener.js

import React from "react";
import "./KeyPressListener.css"

function key_to_num(key_str: string): number {
    let v_out = 0;

    switch (key_str) {
        case "ArrowLeft":
            v_out = 0;
            break;
        case "ArrowRight":
            v_out = 1;
            break;
        case "ArrowUp":
            v_out = 2;
            break;
        case "ArrowDown":
            v_out = 3;
            break;
        default:
            v_out = -1;
            break;
    }

    return v_out;
}

// Disable page movement on arrow key press
function key_disable(e: KeyboardEvent): void {
    const ec: string = e.code;
    if (ec == "ArrowDown" || ec == "ArrowUp" || ec == "ArrowLeft" || ec == "ArrowRight") {
        e.preventDefault();
    }
}

// toggle the arrow key page movement
function toggle_arrow_movement(movement_on: boolean): void {
    if (!movement_on) {
        // console.log("Movement is off")
        window.addEventListener("keydown", key_disable, false);
    } else {
        // console.log("Movement is on")
        window.removeEventListener("keydown", key_disable, false);
    }
}

type ImageData = {
    image_path: string;
    alt: string;
}

function num_to_impath(num: number): ImageData {
    let im_path: ImageData;
    switch (num) {
        case 0:
            im_path = {
                image_path: "./src/assets/arrow_left.png",
                alt: "left arrow"
            };
            break;
        case 1:
            im_path = {
                image_path: "./src/assets/arrow_right.png",
                alt: "right arrow"
            };
            break;
        case 2:
            im_path = {
                image_path: "./src/assets/arrow_up.png",
                alt: "up arrow"
            };
            break;
        case 3:
            im_path = {
                image_path: "./src/assets/arrow_down.png",
                alt: "down arrow"
            };
            break;
        default:
            im_path = {
                image_path: "N/A",
                alt: "N/A"
            };
        }

    return im_path;
}

const success_audios = [new Audio(""), new Audio("./src/assets/18_V_SNC_032_c.wav"), new Audio("./src/assets/18_V_SNC_033_c.wav"), new Audio("./src/assets/18_V_SNC_034_b.wav")];
const audio_dist = [0, 1, 0, 0, 2, 0, 0, 3, 0, 0];
// const audio_dist = [0, 0, 0, 1, 0, 0, 1, 2, 3, 0];

// function random_success_audio(): HTMLAudioElement {
//     const index: number = Math.floor(Math.random() * 10);
//     return success_audios[audio_dist[index]];
// }

function QTESet({ ptr, dir_seq }: {ptr: number, dir_seq: number[]}): React.JSX.Element {
    const dir_set = dir_seq.map((val: number, index: number) => {
        const color = ptr > index ? "arrow-opaque" : "";
        const im_out: ImageData = num_to_impath(val);
        return (
            <img key={index} src={im_out.image_path} alt={im_out.alt} className={"arrow-im " + color}></img>
        );
    });

    return <div className="qte-view">{dir_set}</div>;
}

export default function KeyPressListener(): React.JSX.Element {
    const [last_key_str, set_key_str] = React.useState<string>("");
    const [count, set_count] = React.useState<number>(0);
    const [dir_sequence, set_sequence] = React.useState<number[]>(() => Array(3).fill(null).map(() => {
        return Math.floor(Math.random() * 4);
    }));

    const seq_ptr = React.useRef<number>(0);

    React.useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => set_key_str(event.key);
        window.addEventListener("keyup", handleKeyPress);
        return () => window.removeEventListener("keyup", handleKeyPress);
    });

    React.useEffect(() => {
        let key_num: number = key_to_num(last_key_str);
        if (key_num === dir_sequence[seq_ptr.current]) {
            seq_ptr.current = seq_ptr.current + 1;
            set_key_str("");

            //const success = new Audio("./src/assets/28_sys_worldmap_line.wav");
            //success.play();
        }
    }, [last_key_str]);

    React.useEffect(() => {
        if (seq_ptr.current >= dir_sequence.length) {
            seq_ptr.current = 0;
            const seq_new: number[] = dir_sequence.map(() => {
                return Math.floor(Math.random() * 4);
            });

            //const doorbell = new Audio("./src/assets/doorbell.ogg");
            //const success_audio = random_success_audio();
            //doorbell.play();
            //success_audio.play();
            
            set_count(count + 1);
            set_sequence(seq_new);
        }
    }, [seq_ptr.current]);

    return (
        <div onMouseEnter={() => toggle_arrow_movement(false)} onMouseLeave={() => toggle_arrow_movement(true)} >
            <p className="qte-p-header"> Match the pattern! </p>
            <QTESet ptr={seq_ptr.current} dir_seq={dir_sequence} />
            <p className="bold-txt p-streak">Current streak is: <span className="gold-txt">{count}</span></p>
        </div>
    );
}