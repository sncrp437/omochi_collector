import { ArticlesApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const articlesApi = new ArticlesApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getListArticles = async (page?: number, pageSize?: number) => {
  const res = await articlesApi.articlesList(page, pageSize);
  return res.data;
};

export const getArticleDetail = async (id: string) => {
  const res = await articlesApi.articlesRetrieve(id);
  return res.data;
};
