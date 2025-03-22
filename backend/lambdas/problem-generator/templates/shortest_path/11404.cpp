// BOJ - 11404

#include <stdio.h>

#define INF 987654321

int min(int a,int b)
{
	return a<b?a:b;
}
int main()
{
	int n,m;
	scanf("%d%d",&n,&m);
	int dist[n+1][n+1];
	for(int i=1; i<=n; i++)
		for(int j=1; j<=n; j++)
			dist[i][j]=INF;
	for(int i=0; i<m; i++)
	{
		int from,to,val;
		scanf("%d%d%d",&from,&to,&val);
		dist[from][to]=min(dist[from][to],val);
	} 
	for(int k=1; k<=n; k++)
		for(int i=1; i<=n; i++)
			for(int j=1; j<=n; j++)
				if(i!=j)
					dist[i][j]=min(dist[i][j],dist[i][k]+dist[k][j]);
	for(int i=1; i<=n; puts(""),i++)
		for(int j=1; j<=n; j++)
			printf("%d ",dist[i][j]==INF?0:dist[i][j]);
}