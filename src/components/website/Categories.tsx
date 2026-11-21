import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/api/apiCall";
import { ENDPOINTS } from "@/api/endpoints";


const CategoriesListPublications = [
    {
        id: 1,
        title: 'Incense Media',
        key: 'Incense Media',
        description: 'Industry insights and networking events',
        color: 'bg-primaryRed'
    },
    {
        id: 2,
        title: 'Soap & Detergent Journal',
        key: 'Soap & Detergent',
        description: 'Manufacturing and innovation expo',
        color: 'bg-pink-500'
    },
    {
        id: 3,
        title: 'India Stone & Tile Showcase',
        key: 'Stone & Tiles',
        description: 'Construction and design showcase',
        color: 'bg-primaryRed'
    }
];

const CategoriesListEvent = [
    {
        id: 1,
        title: ' Agarbatti & Perfume Expo',
        key: 'Incense Media',
        description: 'Industry insights and networking events',
        color: 'bg-primaryRed'
    },
    {
        id: 2,
        title: ' Soap, Detergent & Toiletries Expo',
        key: 'Soap & Detergent',
        description: 'Manufacturing and innovation expo',
        color: 'bg-pink-500'
    },
    {
        id: 3,
        title: 'Stone & Tiles Expo',
        key: 'Stone & Tiles',
        description: 'Construction and design showcase',
        color: 'bg-primaryRed'
    }
];

const CategoriesList = [
    {
        id: 1,
        title: 'Incense Media',
        description: 'Industry insights and networking events',
        color: 'bg-primaryRed'
    },
    {
        id: 2,
        title: 'Soap & Detergent',
        description: 'Manufacturing and innovation expo',
        color: 'bg-pink-500'
    },
    {
        id: 3,
        title: 'Stone & Tiles',
        description: 'Construction and design showcase',
        color: 'bg-primaryRed'
    }
];
interface CategoriesProps {
    baseUrl: string;
}

const Categories: React.FC<CategoriesProps> = ({ baseUrl }) => {
    const navigate = useNavigate();
    const [masters, setMasters] = useState([]);
    useEffect(() => {
        fetchMasters();
    }, []);
    const fetchMasters = async () => {
        const slug = baseUrl === "/publications" ? "publication-images" : "event-images";
        const response = await apiCall('get', ENDPOINTS.GET_MASTERS(slug));
        const items = response.data?.data || response.data || [];
        const valid = items.filter((m: any) => m && (m.image || m.image_url));
        setMasters(valid.length > 0 ? valid : items);
    };
    const CategoriesList = baseUrl === "/publications" ? CategoriesListPublications : CategoriesListEvent;
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {masters.map((category, index) => (
                <div
                    key={category.id}
                    className="bg-white cursor-pointer"
                    onClick={() => {
                        if (CategoriesList[index]?.title) {
                            const slug = CategoriesList[index]?.key.toLowerCase().replace(/\s+/g, "-");
                            navigate(`${baseUrl}/${slug}`);
                        }
                    }}
                >
                    <div className={`bg-primaryRed rounded text-white text-center py-3`}>
                        <h3 className="font-bold text-lg">{CategoriesList[index]?.title}</h3>
                    </div>
                    <div className="mt-6">
                        <img
                            src={category.image_url || "/assets/img/banner-images/publications.jpg"}
                            crossOrigin="anonymous"
                            alt={CategoriesList[index]?.title || "Publication"}
                            className="w-full object-cover rounded-lg mb-4 border"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/img/banner-images/publications.jpg";
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Categories;
