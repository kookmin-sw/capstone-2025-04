// BOJ - 1018 체스판 다시 칠하기

#include <iostream>
#include <string>

using namespace std;

int n, m; 

char map[51][51];
string first[8] = {
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW"
};

string second[8] = {
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB",
    "BWBWBWBW",
    "WBWBWBWB"
};

int min(int a, int b) {
    return a < b ? a : b;
}

int checkFirst(int x, int y)
{
    int cnt = 0;
    for(int i = x; i < x + 8; i++)
        for(int j = y; j < y + 8; j++)
            if(map[i][j] != first[i - x][j - y])
                cnt++;
    return cnt;
}

int checkSecond(int x, int y)
{
    int cnt = 0;
    for(int i = x; i < x + 8; i++)
        for(int j = y; j < y + 8; j++)
            if(map[i][j] != second[i - x][j - y])
                cnt++;
    return cnt;
}

int main()
{
    cin >> n >> m;

    for(int i = 0; i < n; i++)
        for(int j = 0; j < m; j++)
            cin >> map[i][j];
    
    int ans = 0x7FFFFFFF;
    for(int i = 0; i <= n - 8; i++)
        for(int j = 0; j <= m - 8; j++)
            ans = min(ans, min(checkFirst(i, j), checkSecond(i, j)));

    cout << ans;
} 