// BOJ - 1389 케빈 베이컨의 6단계 법칙

// 기본적인 Floyd-Warshall 을 다룰 줄 아는 지 물어보는 문제

#include <iostream>
#define ll long long
#define INF 0x7FFFFFFF

using namespace std;

ll n, m;
ll arr[101][5001] = {0, };

// floyd-warshall algorithm
void fw()
{
    for(int k = 0; k < n; k++)
        for(int i = 0; i < n; i++)
            for(int j = 0; j < n; j++)
                if(arr[i][k] + arr[k][j] < arr[i][j])
                    arr[i][j] = arr[i][k] + arr[k][j];
}

// print Map
void printMap()
{
    for(int i = 0; i < n; puts(""), i++)
        for(int j = 0; j < n; j++)
            cout << arr[i][j] << ' ';
}

int main()
{
    for(int i = 0; i < 101; i++)
        for(int j = 0; j < 5001; j++)
            arr[i][j] = INF;

    cin >> n >> m;
    for(int i = 0; i < m; i++)
    {
        int from, to;
        cin >> from >> to;
        arr[from - 1][to - 1] = 1;
        arr[to - 1][from - 1] = 1;
    }

    fw();

    ll answer = INF, an;
    for(int i = 0; i < n; i++)
    {
        ll s = 0;
        for(int j = 0; j < n; j++)
            if(i != j)
                s += arr[i][j];

        if(answer > s)
        {
            an = i;
            answer = s;
        }
    }

    cout << (an + 1) << '\n';
}