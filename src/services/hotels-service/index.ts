import hotelsRepository from "@/repositories/hotels-repository";

async function getHotels() {
    const result = await hotelsRepository.getAllHotelsPrisma();
    return result;
}

const hotelsService = {
    getHotels
};

export default hotelsService;