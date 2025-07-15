
import React from 'react';
import "./GithubUserSearch.css"

const API_URL: string = "https://api.github.com";


type GithubUserData = {
    user_name: string,
    user_pfp_url: string,
    user_page_url: string
};

async function get_user_data(user_query: string | undefined): Promise<GithubUserData[]> {
    if (user_query == undefined) { return []; }
    
    const query_result = await fetch(`${API_URL}/search/users?q=${user_query}`);
    const query_json = await query_result.json();
    const users: GithubUserData[] = query_json.items.map((user_object: any) => {
        // console.log(user_object.html_url);
        return {
            user_name: user_object.login,
            user_pfp_url: user_object.avatar_url,
            user_page_url: user_object.html_url
        }
    });
    
    return users;
}

async function validate_query(
    f: FormData, 
    set_query_func: (r: React.SetStateAction<string | undefined>) => void,
    set_data_func: (r: React.SetStateAction<GithubUserData[]>) => void
) {
    let query: string | undefined = f.get("github-user-query")?.toString();
    if (query != undefined) {
        query = query.trim();
        const users = await get_user_data(query);
        set_data_func(users);
    }
    set_query_func(query);
}

function GithubUserCard(g: GithubUserData): React.JSX.Element {
    return  (
        <div className="user-card-container">
            <img title={`[${g.user_name}] profile picture`} src={g.user_pfp_url} className="github-user-pfp inline" />
            <span className="github-user-name">
                <a className="inline" href={g.user_page_url} target="_blank">
                    {g.user_name}
                </a>
            </span>
        </div>
    );
}

function generate_cards(users: Readonly<GithubUserData[]>) {
    return users.map((g: GithubUserData, idx: number) => {
        return <GithubUserCard key={idx} user_name={g.user_name} user_pfp_url={g.user_pfp_url} user_page_url={g.user_page_url}/>
    });
}

export default function GithubUserSearch(): React.JSX.Element {
    const [_, set_query] = React.useState<string | undefined>(undefined);
    const [user_data, set_user_data] = React.useState<GithubUserData[]>(() => Array(0));

    return (
        <>
            <p>Enter a Github Username</p>
            <form action={(f: FormData) => validate_query(f, set_query, set_user_data)}>
                <input type="text" placeholder="Username" name="github-user-query" maxLength={30} required/>
                <button type="submit">Search</button>
            </form>
            <div className="github-search-results">
                {generate_cards(user_data)}
            </div>
        </>
    );
}