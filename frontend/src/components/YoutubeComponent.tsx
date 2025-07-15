import Youtube from 'react-youtube';

export default function YoutubeComponent() {
    const video_id: string ="SkwoyRYa53U";
    return (
        <div>
            <p>check out my cool youtube video</p>
            <Youtube videoId={video_id}/>
        </div>
    );
}